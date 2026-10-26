import { createHash } from 'node:crypto';
import {
  constants as fsConstants,
  closeSync,
  fstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  statSync,
  type BigIntStats,
} from 'node:fs';
import path from 'node:path';

const digest = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function createPreparedReadCapture(
  rootPath: string,
  intakePath: string | undefined,
  seed: readonly Record<string, unknown>[] = [],
  reserve?: (operations: number, bytes: number) => boolean,
  requiredRoles: readonly string[] = [],
  allowedRoles: readonly string[] = requiredRoles,
) {
  const maxBytes = 4 * 1024 * 1024;
  const maxOperations = 4096;
  const targets = new Map<string, string>();
  type Stream = {
    id: string;
    fd: number;
    path: string;
    role: string;
    read_method: 'readSync' | 'readFileSync' | 'readFileDescriptorBoundedSync';
    identity: Record<string, string>;
    length: number;
    next: number;
    reads: number;
    eof: boolean;
    complete: boolean;
    payload_ids: string[];
  };
  const streams = new Map<number, Stream>();
  const boundedReads = new Set<number>();
  const completed: Array<Record<string, unknown>> = [];
  const operations: Array<Record<string, unknown>> = [];
  const unreadOpens: Array<Record<string, unknown>> = [];
  const payloads = new Map<string, { id: string; path: string; sha256: string; bytes: string; raw: Buffer }>();
  const issues: string[] = [];
  let payloadBytes = 0;
  let nextStream = 0;
  const originalOpen = openSync;
  const originalRead = readSync;
  const originalClose = closeSync;
  const originalReadFile = readFileSync;
  const originalFstat = fstatSync;
  const identityOf = (stat: BigIntStats) => {
    if (!stat.isFile() || stat.nlink !== 1n) throw new Error('Prepared input is not a regular single-link file.');
    return {
      dev: String(stat.dev),
      ino: String(stat.ino),
      size: String(stat.size),
      mode: String(stat.mode),
      nlink: String(stat.nlink),
      mtime: String(stat.mtimeNs),
      ctime: String(stat.ctimeNs),
    };
  };
  const identity = (fd: number) => identityOf(originalFstat(fd, { bigint: true }));
  const pathIdentity = (file: string) => identityOf(statSync(file, { bigint: true }));
  if (!path.isAbsolute(rootPath) || (intakePath !== undefined && !path.isAbsolute(intakePath)))
    throw new Error('Prepared observer requires its validated absolute root and any explicit intake.');
  const charge = (value: unknown, operations = 0) => {
    if (reserve && !reserve(operations, Buffer.byteLength(JSON.stringify(value))))
      throw new Error('Shared CLI consumption bound exceeded.');
  };
  const add = (file: string, role: string) => {
    const relative = path.relative(rootPath, file);
    if (
      !relative ||
      relative === '..' ||
      relative.startsWith('..' + path.sep) ||
      path.isAbsolute(relative) ||
      realpathSync(file) !== file
    )
      throw new Error('Prepared input path is not canonical within its project root.');
    const previous = targets.get(file);
    if (previous !== undefined && previous !== role) throw new Error('Prepared input roles alias the same file.');
    targets.set(file, role);
  };
  add(path.join(rootPath, 'agent-runtime.config.v1.yaml'), 'runtime-config');
  add(path.join(rootPath, '.agent', 'runtime-initialization.v1.json'), 'runtime-initialization');
  if (intakePath !== undefined) add(intakePath, 'intake');
  for (const target of seed) {
    if (
      typeof target.path !== 'string' ||
      typeof target.role !== 'string' ||
      !allowedRoles.some((role) => role === target.role)
    )
      throw new Error('Prepared input target metadata is invalid.');
    add(target.path, target.role);
  }
  const derived = new Set<string>();
  const derive = (role: string, bytes: Buffer, hash: string) => {
    const key = role + ':' + hash;
    if (derived.has(key) || (role !== 'intake' && role !== 'scope')) return;
    const value: unknown = JSON.parse(bytes.toString('utf8'));
    if (!isRecord(value)) throw new Error('Prepared path input is not an object.');
    if (role === 'intake') {
      for (const [field, nextRole] of [
        ['scope_path', 'scope'],
        ['acceptance_path', 'acceptance'],
      ] as const) {
        const relative = value[field];
        if (typeof relative !== 'string' || path.isAbsolute(relative))
          throw new Error('Prepared intake path is invalid.');
        add(path.resolve(rootPath, relative), nextRole);
      }
    } else {
      const paths = value.implementation_paths;
      if (!Array.isArray(paths) || paths.length !== 1 || typeof paths[0] !== 'string' || path.isAbsolute(paths[0]))
        throw new Error('Prepared scope does not select one relative source.');
      add(path.resolve(rootPath, paths[0]), 'selected-source');
    }
    derived.add(key);
  };
  const isRootBoundDescriptorPath = (requestedPath: string, canonical: string, flags: unknown) => {
    const match = /^\/proc\/self\/fd\/([1-9]\d*)\/([^/]+)$/u.exec(requestedPath);
    if (
      process.platform !== 'linux' ||
      !match ||
      typeof flags !== 'number' ||
      (flags & fsConstants.O_NOFOLLOW) === 0 ||
      match[2] !== path.basename(canonical)
    )
      return false;
    const parentFd = Number(match[1]);
    try {
      return (
        originalFstat(parentFd).isDirectory() && realpathSync(`/proc/self/fd/${parentFd}`) === path.dirname(canonical)
      );
    } catch {
      return false;
    }
  };
  const observeOpenedFile = (requestedPath: string, fd: number, flags?: unknown) => {
    const absolute = path.resolve(requestedPath);
    const requestedRole = targets.get(absolute);
    let canonical: string;
    try {
      canonical = realpathSync(absolute);
    } catch {
      if (requestedRole) issues.push('Prepared input open observation failed.');
      return;
    }
    const canonicalRole = targets.get(canonical);
    if (!requestedRole && !canonicalRole) return;
    if (absolute !== canonical && !isRootBoundDescriptorPath(absolute, canonical, flags)) {
      issues.push('Prepared input open path is not canonical.');
      return;
    }
    if (!canonicalRole) return;
    try {
      if (nextStream >= maxOperations || streams.has(fd))
        throw new Error('Prepared open bound or descriptor identity failed.');
      streams.set(fd, {
        id: 's' + nextStream++,
        fd,
        path: canonical,
        role: canonicalRole,
        read_method: 'readSync',
        identity: identity(fd),
        length: 0,
        next: 0,
        reads: 0,
        eof: false,
        complete: true,
        payload_ids: [],
      });
    } catch {
      issues.push('Prepared input open observation failed.');
    }
  };
  const wrappedOpen = function (this: unknown, ...call: unknown[]): number {
    const fd = Reflect.apply(originalOpen, this, call) as number;
    if (typeof call[0] === 'string') observeOpenedFile(call[0], fd, call[1]);
    return fd;
  };
  const wrappedRead = function (this: unknown, ...call: unknown[]): number {
    const stream = streams.get(Number(call[0]));
    let count: number;
    try {
      count = Reflect.apply(originalRead, this, call) as number;
    } catch (error) {
      if (stream) issues.push('Prepared native read failed.');
      throw error;
    }
    if (!stream || boundedReads.has(Number(call[0]))) return count;
    stream.reads++;
    try {
      if (operations.length >= maxOperations || stream.eof)
        throw new Error('Prepared read bound or EOF ordering failed.');
      const buffer = call[1];
      const offset = call[2];
      const requested = call[3];
      const position = call[4] == null ? stream.next : call[4];
      if (
        !Buffer.isBuffer(buffer) ||
        !Number.isSafeInteger(offset) ||
        Number(offset) < 0 ||
        !Number.isSafeInteger(requested) ||
        Number(requested) < 0 ||
        !Number.isSafeInteger(count) ||
        count < 0 ||
        count > Number(requested) ||
        Number(offset) + Number(requested) > buffer.length ||
        position !== stream.next
      )
        throw new Error('Prepared native read shape is unsupported.');
      const bytes = Buffer.from(buffer.subarray(Number(offset), Number(offset) + count));
      let payloadId: string | null = null;
      if (count > 0) {
        let payload = [...payloads.values()].find((value) => value.path === stream.path && value.raw.equals(bytes));
        if (!payload) {
          if (payloadBytes + count > maxBytes) throw new Error('Prepared unique-byte bound exceeded.');
          payload = {
            id: 'p' + payloads.size,
            path: stream.path,
            sha256: digest(bytes),
            bytes: bytes.toString('base64'),
            raw: bytes,
          };
          charge({ id: payload.id, path: payload.path, sha256: payload.sha256, bytes: payload.bytes });
          payloads.set(payload.id, payload);
          payloadBytes += count;
        }
        payloadId = payload.id;
        stream.payload_ids.push(payloadId);
        stream.length += count;
        stream.next += count;
      } else {
        stream.eof = true;
        if (
          !stream.complete ||
          String(stream.length) !== stream.identity.size ||
          JSON.stringify(identity(stream.fd)) !== JSON.stringify(stream.identity)
        )
          throw new Error('Prepared input changed or was not completely read.');
        const chunks = stream.payload_ids.map((id) => payloads.get(id)!.raw);
        const bytes = chunks.length === 1 ? chunks[0]! : Buffer.concat(chunks);
        const hash = chunks.length === 1 ? payloads.get(stream.payload_ids[0]!)!.sha256 : digest(bytes);
        const completion = {
          id: stream.id,
          fd: stream.fd,
          role: stream.role,
          read_method: stream.read_method,
          path: stream.path,
          identity: stream.identity,
          bytes: bytes.length,
          sha256: hash,
          payload_ids: [...stream.payload_ids],
          complete: true,
        };
        charge(completion);
        completed.push(completion);
        derive(stream.role, bytes, hash);
      }
      const operation = {
        sequence: operations.length + 1,
        stream_id: stream.id,
        fd: stream.fd,
        path: stream.path,
        role: stream.role,
        read_method: stream.read_method,
        file_position: position,
        requested_position: call[4] ?? null,
        buffer_offset: offset,
        requested_count: requested,
        bytes_read: count,
        eof: count === 0,
        payload_id: payloadId,
      };
      charge(operation, 1);
      operations.push(operation);
    } catch {
      stream.complete = false;
      issues.push('Prepared read observation failed.');
    }
    return count;
  };
  const wrappedClose = function (this: unknown, ...call: unknown[]): unknown {
    const stream = streams.get(Number(call[0]));
    if (stream && stream.reads > 0 && (!stream.eof || !stream.complete))
      issues.push('Prepared consumed input closed without a complete stream.');
    const result: unknown = Reflect.apply(originalClose, this, call);
    if (stream?.reads === 0)
      unreadOpens.push({ id: stream.id, fd: stream.fd, role: stream.role, path: stream.path, closed: true });
    streams.delete(Number(call[0]));
    return result;
  };
  const readFileOptions = (value: unknown): { supported: boolean; encoding?: 'utf8' } => {
    if (value === undefined) return { supported: true };
    if (typeof value === 'string')
      return ['utf8', 'utf-8'].includes(value.toLowerCase())
        ? { supported: true, encoding: 'utf8' }
        : { supported: false };
    if (!isRecord(value)) return { supported: false };
    try {
      const names = Object.keys(value);
      const encoding = Reflect.get(value, 'encoding');
      const flag = Reflect.get(value, 'flag');
      const supported =
        names.every((name) => name === 'encoding' || name === 'flag') &&
        (flag === undefined || flag === 'r') &&
        (encoding === undefined ||
          encoding === null ||
          (typeof encoding === 'string' && ['utf8', 'utf-8'].includes(encoding.toLowerCase())));
      if (supported && typeof encoding === 'string') return { supported: true, encoding: 'utf8' };
      return { supported };
    } catch {
      return { supported: false };
    }
  };
  const wrapBoundedDescriptorRead =
    (readBounded: (fd: number, maxBytes: number) => Buffer): ((fd: number, maxBytes: number) => Buffer) =>
    (fd, maxReadBytes) => {
      const stream = streams.get(fd);
      if (!stream) return readBounded(fd, maxReadBytes);
      if (
        !Number.isSafeInteger(maxReadBytes) ||
        maxReadBytes < 0 ||
        maxReadBytes > maxBytes ||
        stream.reads > 0 ||
        stream.eof ||
        stream.length !== 0
      ) {
        stream.complete = false;
        issues.push('Prepared bounded descriptor read did not start at the observed file offset.');
        return readBounded(fd, maxReadBytes);
      }

      let bytes: Buffer;
      boundedReads.add(fd);
      try {
        bytes = readBounded(fd, maxReadBytes);
      } catch (error) {
        stream.complete = false;
        issues.push('Prepared bounded descriptor read failed before its bytes were observed.');
        throw error;
      } finally {
        boundedReads.delete(fd);
      }

      try {
        if (
          !Buffer.isBuffer(bytes) ||
          bytes.length > maxReadBytes ||
          stream.reads !== 0 ||
          String(bytes.length) !== stream.identity.size ||
          JSON.stringify(identity(fd)) !== JSON.stringify(stream.identity) ||
          JSON.stringify(pathIdentity(stream.path)) !== JSON.stringify(stream.identity)
        )
          throw new Error('Prepared bounded descriptor read result or identity is incomplete.');
        const payload = [...payloads.values()].find((value) => value.path === stream.path && value.raw.equals(bytes));
        const retained = payload ?? {
          id: 'p' + payloads.size,
          path: stream.path,
          sha256: digest(bytes),
          bytes: bytes.toString('base64'),
          raw: Buffer.from(bytes),
        };
        if (!payload) {
          if (payloadBytes + bytes.length > maxBytes) throw new Error('Prepared unique-byte bound exceeded.');
          charge({ id: retained.id, path: retained.path, sha256: retained.sha256, bytes: retained.bytes });
          payloads.set(retained.id, retained);
          payloadBytes += bytes.length;
        }
        stream.read_method = 'readFileDescriptorBoundedSync';
        stream.reads++;
        stream.length = bytes.length;
        stream.next = bytes.length;
        stream.eof = true;
        stream.payload_ids.push(retained.id);
        const completion = {
          id: stream.id,
          fd: stream.fd,
          role: stream.role,
          read_method: stream.read_method,
          path: stream.path,
          identity: stream.identity,
          bytes: bytes.length,
          sha256: retained.sha256,
          payload_ids: [...stream.payload_ids],
          complete: true,
        };
        charge(completion);
        completed.push(completion);
        const operation = {
          sequence: operations.length + 1,
          stream_id: stream.id,
          fd: stream.fd,
          path: stream.path,
          role: stream.role,
          read_method: stream.read_method,
          file_position: 0,
          requested_position: null,
          buffer_offset: 0,
          requested_count: maxReadBytes,
          bytes_read: bytes.length,
          eof: false,
          complete_result: true,
          payload_id: retained.id,
        };
        charge(operation, 1);
        operations.push(operation);
        derive(stream.role, bytes, retained.sha256);
        return bytes;
      } catch {
        stream.complete = false;
        issues.push('Prepared bounded descriptor read result or identity is incomplete.');
        return bytes;
      }
    };
  const wrappedReadFile = function (this: unknown, ...call: unknown[]): unknown {
    let file = '';
    let role: string | undefined;
    let stream = typeof call[0] === 'number' ? streams.get(call[0]) : undefined;
    let witnessFd: number | undefined;
    const { supported: supportedOptions, encoding } = readFileOptions(call[1]);
    try {
      if (typeof call[0] === 'string') {
        file = path.resolve(call[0]);
        role = targets.get(file);
        const canonical = realpathSync(file);
        if (!role && targets.has(canonical)) {
          issues.push('Prepared readFileSync path is not canonical.');
        } else if (role && !supportedOptions) {
          issues.push('Prepared readFileSync options are unsupported.');
          role = undefined;
        }
        if (role) {
          if (canonical !== file || !supportedOptions || nextStream >= maxOperations)
            throw new Error('Prepared readFileSync path or stream identity is invalid.');
          const beforeIdentity = pathIdentity(file);
          witnessFd = originalOpen(file, 'r');
          const witnessIdentity = identity(witnessFd);
          if (JSON.stringify(beforeIdentity) !== JSON.stringify(witnessIdentity))
            throw new Error('Prepared readFileSync path changed while its witness was opened.');
          stream = {
            id: 's' + nextStream++,
            fd: witnessFd,
            path: file,
            role,
            read_method: 'readFileSync',
            identity: witnessIdentity,
            length: 0,
            next: 0,
            reads: 0,
            eof: false,
            complete: true,
            payload_ids: [],
          };
        }
      }
    } catch {
      if (witnessFd !== undefined) {
        try {
          Reflect.apply(originalClose, this, [witnessFd]);
        } catch {
          issues.push('Prepared readFileSync identity descriptor could not be closed.');
        }
        witnessFd = undefined;
      }
      if (role !== undefined) issues.push('Prepared readFileSync input identity could not be observed.');
    }
    const capturedStream = stream && supportedOptions ? stream : undefined;
    if (stream && !supportedOptions) {
      stream.complete = false;
      issues.push('Prepared readFileSync options are unsupported.');
    }
    let result: unknown;
    try {
      result = capturedStream
        ? Reflect.apply(originalReadFile, this, [capturedStream.fd])
        : Reflect.apply(originalReadFile, this, call);
    } catch (error) {
      if (capturedStream) {
        capturedStream.complete = false;
        issues.push('Prepared readFileSync failed before its bytes were observed.');
      }
      if (witnessFd !== undefined) {
        try {
          Reflect.apply(originalClose, this, [witnessFd]);
        } catch {
          issues.push('Prepared readFileSync identity descriptor could not be closed.');
        }
      }
      throw error;
    }
    if (!capturedStream) {
      if (witnessFd !== undefined) {
        try {
          Reflect.apply(originalClose, this, [witnessFd]);
        } catch {
          issues.push('Prepared readFileSync identity descriptor could not be closed.');
        }
      }
      return result;
    }
    const output = capturedStream && Buffer.isBuffer(result) && encoding ? result.toString(encoding) : result;
    try {
      if (capturedStream.reads > 0 || capturedStream.eof || operations.length >= maxOperations)
        throw new Error('Prepared readFileSync stream was already consumed or exceeded its bound.');
      if (!Buffer.isBuffer(result)) throw new Error('Prepared readFileSync did not return exact input bytes.');
      const bytes = Buffer.from(result);
      const finalIdentity = identity(capturedStream.fd);
      if (
        JSON.stringify(finalIdentity) !== JSON.stringify(capturedStream.identity) ||
        JSON.stringify(pathIdentity(capturedStream.path)) !== JSON.stringify(capturedStream.identity) ||
        String(bytes.length) !== capturedStream.identity.size ||
        (witnessFd !== undefined && realpathSync(file) !== file)
      )
        throw new Error('Prepared readFileSync input changed or was not read in full.');
      let payload = [...payloads.values()].find(
        (value) => value.path === capturedStream.path && value.raw.equals(bytes),
      );
      if (!payload) {
        if (payloadBytes + bytes.length > maxBytes) throw new Error('Prepared unique-byte bound exceeded.');
        payload = {
          id: 'p' + payloads.size,
          path: capturedStream.path,
          sha256: digest(bytes),
          bytes: bytes.toString('base64'),
          raw: bytes,
        };
        charge({ id: payload.id, path: payload.path, sha256: payload.sha256, bytes: payload.bytes });
        payloads.set(payload.id, payload);
        payloadBytes += bytes.length;
      }
      capturedStream.read_method = 'readFileSync';
      capturedStream.reads++;
      capturedStream.length = bytes.length;
      capturedStream.next = bytes.length;
      capturedStream.eof = true;
      capturedStream.payload_ids.push(payload.id);
      const completion = {
        id: capturedStream.id,
        fd: capturedStream.fd,
        role: capturedStream.role,
        read_method: 'readFileSync',
        path: capturedStream.path,
        identity: capturedStream.identity,
        bytes: bytes.length,
        sha256: payload.sha256,
        payload_ids: [...capturedStream.payload_ids],
        complete: true,
      };
      charge(completion);
      completed.push(completion);
      derive(capturedStream.role, bytes, payload.sha256);
      const operation = {
        sequence: operations.length + 1,
        stream_id: capturedStream.id,
        fd: capturedStream.fd,
        path: capturedStream.path,
        role: capturedStream.role,
        read_method: 'readFileSync',
        file_position: 0,
        requested_position: null,
        buffer_offset: 0,
        requested_count: bytes.length,
        bytes_read: bytes.length,
        eof: true,
        payload_id: payload.id,
      };
      charge(operation, 1);
      operations.push(operation);
      if (witnessFd !== undefined) streams.set(witnessFd, capturedStream);
    } catch {
      capturedStream.complete = false;
      issues.push('Prepared readFileSync observation failed.');
    } finally {
      if (witnessFd !== undefined) {
        try {
          wrappedClose.call(this, witnessFd);
        } catch {
          issues.push('Prepared readFileSync identity descriptor could not be closed.');
        }
      }
    }
    return output;
  };
  return {
    apis: { openSync: wrappedOpen, readSync: wrappedRead, closeSync: wrappedClose, readFileSync: wrappedReadFile },
    observeRootFileOpen: observeOpenedFile,
    wrapBoundedDescriptorRead,
    finish: () => {
      const roles = requiredRoles;
      for (const role of roles)
        if (!completed.some((row) => row.role === role)) issues.push('Prepared input was not consumed: ' + role);
      for (const stream of streams.values()) {
        if (stream.reads > 0) issues.push('Prepared consumed descriptor remained open.');
        else unreadOpens.push({ id: stream.id, fd: stream.fd, role: stream.role, path: stream.path, closed: false });
      }
      return {
        complete: issues.length === 0,
        issues,
        streams: completed,
        operations,
        opens_without_observed_reads: unreadOpens,
        payloads: [...payloads.values()].map(({ raw: _raw, ...payload }) => payload),
        limits: {
          max_bytes: maxBytes,
          max_operations: maxOperations,
          operations: operations.length,
          unique_bytes: payloadBytes,
        },
      };
    },
  };
}
