#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export LC_ALL=C

fail() { printf 'vida-agent installer: %s\n' "$*" >&2; exit 1; }
[[ $# == 0 ]] || fail 'Usage: install.sh'
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || fail 'Only Linux x86_64 is supported.'
glibc=$(getconf GNU_LIBC_VERSION 2>/dev/null) || fail 'glibc 2.35 or newer is required.'
[[ $glibc =~ ^glibc\ ([0-9]+)\.([0-9]+)$ ]] || fail 'glibc 2.35 or newer is required.'
(( 10#${BASH_REMATCH[1]} > 2 || (10#${BASH_REMATCH[1]} == 2 && 10#${BASH_REMATCH[2]} >= 35) )) || fail 'glibc 2.35 or newer is required.'
[[ ${HOME:-} == /* && -d $HOME && ! -L $HOME ]] || fail 'HOME must be an existing absolute non-linked directory.'
for name in sha256sum timeout flock; do command -v "$name" >/dev/null || fail "$name is required."; done

command -v curl >/dev/null || fail 'curl is required.'

safe_dir() {
  local p=$1 cursor=/ part
  IFS=/ read -r -a parts <<< "${p#/}"
  for part in "${parts[@]}"; do
    [[ -n $part && $part != . && $part != .. ]] || fail 'Unsafe installation path.'
    cursor=${cursor%/}/$part
    [[ ! -L $cursor ]] || fail 'Installation path is linked.'
    if [[ ! -e $cursor ]]; then mkdir "$cursor" || fail 'Cannot create installation directory.'; fi
    [[ -d $cursor ]] || fail 'Installation path is not a directory.'
  done
}
bin=$HOME/.local/bin
safe_dir "$bin"
command_path=$bin/vida-agent
receipt=$bin/.vida-agent-installation
lock=$bin/.vida-agent-installation.lock
[[ ! -L $lock && ( ! -e $lock || -f $lock ) ]] || fail 'Unsafe installation lock.'
exec 9>>"$lock"
flock -n 9 || fail 'Another installation is in progress.'
shopt -s nullglob
stale=("$bin"/.vida-agent-install-*)
(( ${#stale[@]} == 0 )) || fail 'Earlier installation requires inspection before retry.'
[[ ! -L $command_path && ! -L $receipt ]] || fail 'Installation target or receipt is linked.'
prior_hash=
if [[ -e $command_path || -e $receipt ]]; then
  [[ -f $command_path && -f $receipt ]] || fail 'Existing executable is not owned by this installer.'
  IFS= read -r prior_hash < "$receipt" || fail 'Invalid installation receipt.'
  [[ $prior_hash =~ ^[0-9a-f]{64}$ && $(wc -c < "$receipt") -eq 65 ]] || fail 'Invalid installation receipt.'
  [[ $(sha256sum < "$command_path" | cut -d ' ' -f 1) == "$prior_hash" ]] || fail 'Installed executable differs from its receipt.'
fi
stage=$(mktemp -d "$bin/.vida-agent-install-XXXXXXXX") || fail 'Cannot create staging directory.'
phase=preparing
candidate_hash=
receipt_matches() {
  if [[ -n $prior_hash ]]; then
    [[ -f $receipt && ! -L $receipt && $(wc -c < "$receipt") -eq 65 && $(cat "$receipt") == "$prior_hash" ]]
  else
    [[ ! -e $receipt && ! -L $receipt ]]
  fi
}
recovery() {
  local result=$?
  trap - EXIT
  if (( result != 0 )); then
    case $phase in
      publishing|committing|rolling_back)
        printf 'Installation effect is UNKNOWN. Preserve all files and inspect before retry.\n' >&2 ;;
      published)
        if [[ -f $command_path && ! -L $command_path && $(sha256sum < "$command_path" | cut -d ' ' -f 1) == "$candidate_hash" ]] && receipt_matches; then
          if [[ -n $prior_hash && -f $stage/previous && ! -L $stage/previous && $(sha256sum < "$stage/previous" | cut -d ' ' -f 1) == "$prior_hash" ]]; then
            phase=rolling_back
            printf '%s\n' "$phase" > "$stage/phase" && mv -f -- "$stage/previous" "$command_path" && printf 'Installation rolled back.\n' >&2 || printf 'Rollback effect is UNKNOWN.\n' >&2
          elif [[ -z $prior_hash ]]; then
            phase=rolling_back
            printf '%s\n' "$phase" > "$stage/phase" && mv -- "$command_path" "$stage/failed-candidate" && printf 'Installation rolled back.\n' >&2 || printf 'Rollback effect is UNKNOWN.\n' >&2
          else
            printf 'Prior executable differs; recovery is UNKNOWN.\n' >&2
          fi
        else
          printf 'Target or receipt changed; recovery is UNKNOWN.\n' >&2
        fi ;;
      committed) printf 'Installation committed; cleanup did not complete.\n' >&2 ;;
    esac
    printf 'Retained installer files at %s. Inspect before retry.\n' "$stage" >&2
  fi
  exit "$result"
}
trap recovery EXIT
repo=https://github.com/pomazanbohdan/vida-stack-lite
selected=$(curl -fsSIL --proto '=https' --proto-redir '=https' --connect-timeout 15 --max-time 30 -o /dev/null -w '%{url_effective}' "$repo/releases/latest") || fail 'Could not select the latest release.'
[[ $selected == "$repo"/releases/tag/* ]] || fail 'Latest release did not resolve to a trusted repository tag.'
tag=${selected#"$repo"/releases/tag/}
semver='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
[[ $tag == v* && ${tag#v} =~ $semver && ${#tag} -le 128 ]] || fail 'Latest release has an invalid version tag.'
release_version=${tag#v}
for item in SHA256SUMS-linux-x64 vida-agent-bun-linux-x64.manifest.json vida-agent-bun-linux-x64; do
  destination=$stage/$item
  limit=268435456
  case $item in SHA256SUMS-linux-x64) limit=1024 ;; *.manifest.json) limit=1048576 ;; vida-agent-bun-linux-x64) destination=$stage/candidate ;; esac
  curl -fsSL --proto '=https' --proto-redir '=https' --connect-timeout 15 --max-time 120 "$repo/releases/download/$tag/$item" | head -c "$((limit + 1))" > "$destination" || fail "Could not download $item."
  [[ $(wc -c < "$destination") -le $limit ]] || fail "$item exceeds its size limit."
done
checksum_line='^([0-9a-f]{64})  (vida-agent-bun-linux-x64\.manifest\.json|vida-agent-bun-linux-x64)$'
manifest_hash= candidate_hash= lines=0
while IFS= read -r line || [[ -n $line ]]; do
  (( lines += 1 ))
  [[ $line =~ $checksum_line ]] || fail 'Invalid checksum entry.'
  case ${BASH_REMATCH[2]} in
    vida-agent-bun-linux-x64.manifest.json) [[ -z $manifest_hash ]] || fail 'Duplicate manifest checksum.'; manifest_hash=${BASH_REMATCH[1]} ;;
    vida-agent-bun-linux-x64) [[ -z $candidate_hash ]] || fail 'Duplicate native checksum.'; candidate_hash=${BASH_REMATCH[1]} ;;
  esac
done < "$stage/SHA256SUMS-linux-x64"
[[ $lines == 2 && -n $manifest_hash && -n $candidate_hash ]] || fail 'Checksum entries are incomplete.'
manifest=$stage/vida-agent-bun-linux-x64.manifest.json
[[ $(sha256sum < "$manifest" | cut -d ' ' -f 1) == "$manifest_hash" && $(sha256sum < "$stage/candidate" | cut -d ' ' -f 1) == "$candidate_hash" ]] || fail 'Release bytes differ from their checksums.'
expected_bytes=$(wc -c < "$stage/candidate")
[[ $expected_bytes -gt 0 && $(wc -c < "$manifest") -gt 0 ]] || fail 'Artifact size is invalid.'
chmod 700 "$stage/candidate"
probe() {
  local file=$1 argument=$2
  (cd "$stage" && ulimit -c 0 && ulimit -f 4 && env -i HOME="$stage" TMPDIR="$stage" LANG=C LC_ALL=C timeout 5 "$file" "$argument") > "$stage/probe.out" 2> "$stage/probe.err" || fail 'Native identity or version check failed.'
  [[ ! -s $stage/probe.err && $(wc -c < "$stage/probe.out") -le 4096 ]] || fail 'Native check returned invalid output.'
}
probe "$stage/candidate" --vida-internal-native-identity-v1
identity=$(cat "$stage/probe.out")
identity_pattern='^\{"schema":"VidaStandaloneIdentity/v1","version":"([0-9]+\.[0-9]+\.[0-9]+)","pin":"([0-9]+\.[0-9]+\.[0-9]+)","target":"linux-x64","payloadId":"([a-f0-9]{64})","resourceIndexDigest":"([a-f0-9]{64})"\}$'
[[ $identity =~ $identity_pattern ]] || fail 'Native identity differs.'
version=${BASH_REMATCH[1]}
[[ ${BASH_REMATCH[3]} == "${BASH_REMATCH[4]}" ]] || fail 'Native resource identity differs.'
[[ -z ${release_version:-} || $version == "$release_version" ]] || fail 'Native version differs from release tag.'
[[ $(sha256sum < "$stage/candidate" | cut -d ' ' -f 1) == "$candidate_hash" && $(sha256sum < "$manifest" | cut -d ' ' -f 1) == "$manifest_hash" ]] || fail 'Candidate or manifest changed during inspection.'
if [[ -n $prior_hash ]]; then
  [[ -f $command_path && ! -L $command_path && $(sha256sum < "$command_path" | cut -d ' ' -f 1) == "$prior_hash" ]] && receipt_matches || fail 'Installed executable or receipt changed before replacement.'
  cp -p -- "$command_path" "$stage/previous"
  [[ $(sha256sum < "$stage/previous" | cut -d ' ' -f 1) == "$prior_hash" && -f $command_path && ! -L $command_path && $(sha256sum < "$command_path" | cut -d ' ' -f 1) == "$prior_hash" ]] && receipt_matches || fail 'Installed executable or receipt changed during preparation.'
else
  [[ ! -e $command_path && ! -L $command_path ]] && receipt_matches || fail 'Installation target appeared.'
fi
printf '%s\n' "$candidate_hash" > "$stage/receipt"
phase=publishing
printf '%s\n' "$phase" > "$stage/phase"
if [[ -n $prior_hash ]]; then
  mv -f -- "$stage/candidate" "$command_path"
else
  ln -- "$stage/candidate" "$command_path" || fail 'Installation target appeared.'
fi
phase=published
printf '%s\n' "$phase" > "$stage/phase"
probe "$command_path" version
[[ $(cat "$stage/probe.out") == "{\"schema\":\"VidaAgentPackage/v1\",\"name\":\"vida-agent\",\"version\":\"$version\"}" ]] || fail 'Installed version differs.'
[[ -f $command_path && ! -L $command_path && $(sha256sum < "$command_path" | cut -d ' ' -f 1) == "$candidate_hash" ]] && receipt_matches || fail 'Installed executable or receipt changed during inspection.'
phase=committing
printf '%s\n' "$phase" > "$stage/phase"
mv -f -- "$stage/receipt" "$receipt"
phase=committed
printf '%s\n' "$phase" > "$stage/phase"
rm -rf -- "$stage"
action=install
[[ -z $prior_hash ]] || action=update
json_string() {
  local text=$1 out='"' character code i
  for ((i=0; i<${#text}; i++)); do
    character=${text:i:1}
    case $character in
      '"') out+='\"' ;;
      '\') out+='\\' ;;
      *) printf -v code '%d' "'$character"; if (( code < 32 )); then printf -v character '\\u%04x' "$code"; fi; out+=$character ;;
    esac
  done
  printf '%s"' "$out"
}
printf '{"schema":"VidaNativeInstallationResult/v1","action":"%s","path":%s,"version":"%s","bytes":%s,"sha256":"%s","path_added":false,"cleanup_complete":true,"runtime_accepted":false}\n' "$action" "$(json_string "$command_path")" "$version" "$expected_bytes" "$candidate_hash"
printf 'Add %s to PATH if needed.\n' "$bin" >&2
