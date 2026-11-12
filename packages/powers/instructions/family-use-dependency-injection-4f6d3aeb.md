---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-dependency-injection-4f6d3aeb"
title: "Use dependency injection"
summary: "Use dependency injection; each stack variant keeps its own guidance."
capability_tags: 
  - "design-structure"
pattern_tags: 
  - "structural-design"
conditions_applies_when: "Applies when the selected framework variant matches."
conditions_does_not_apply_when: "The framework is not one of the declared variants or the variant exception applies."
artifact_contract_output_type: "none"
artifact_contract_required_data: []
artifact_contract_verified_by: "Each selected variant retains its source-specific contract and is checked against its source-bound guidance."
compatibility_excludes: []
compatibility_requires: []
roles: []
products: []
provenance: 
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use dependency injection\",\"summary\":\"Register services in a Microsoft.Extensions.DependencyInjection container during startup before any view is constructed - resolve ViewModels through the provider not via a static ServiceLocator\",\"capability_tags\":[\"design-structure\"],\"pattern_tags\":[\"structural-design\"],\"conditions_applies_when\":\"Architecture guidance for avalonia 12.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-avalonia-use-dependency-injection\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/avalonia.csv\",\"rowKey\":\"path=stacks/avalonia.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=4a86180019b0947c1f78171fe798bd0a9c31e32adf6e3b94dd2ff1d36e9c5f91\",\"rawSha256\":\"442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"},\"sourceLabel\":\"avalonia 12\",\"applicability\":{\"frameworks\":[{\"name\":\"avalonia\",\"sourceLabel\":\"avalonia 12\"}],\"requiredContext\":[\"framework:avalonia\"]},\"contentSha256\":\"269a9bec162aed91b9ce90962ce0973d2c0b658430837343eea548b2045cc046\"},{\"title\":\"Use dependency injection\",\"summary\":\"Inject dependencies for testing\",\"capability_tags\":[\"design-structure\"],\"pattern_tags\":[\"structural-design\"],\"conditions_applies_when\":\"Architecture guidance for swiftui current; iOS 16+ baseline; Observation APIs iOS 17+.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-swiftui-use-dependency-injection\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/swiftui.csv\",\"rowKey\":\"path=stacks/swiftui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=b866892b89ae57392de713fd665bacaf4672dbe6206476dc743d4c60400d7da8\",\"rawSha256\":\"bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"},\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\",\"applicability\":{\"frameworks\":[{\"name\":\"swiftui\",\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\"}],\"requiredContext\":[\"framework:swiftui\"]},\"contentSha256\":\"77c7431f18df3b27c55e0779271c7d9a007b6c92c8a93b8a81beb91eb8788b53\"},{\"title\":\"Use dependency injection\",\"summary\":\"Register services for testability\",\"capability_tags\":[\"design-structure\"],\"pattern_tags\":[\"structural-design\"],\"conditions_applies_when\":\"Architecture guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-use-dependency-injection\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=bc3d1036cfa1b17f037d77fbff1217c5fe8d62d58a7037852e55d3b6171000d3\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"e80a37f8a8f0549c73859b1e67da10bc8408aaaf17bc5bef57f08a821e91db6f\"},{\"title\":\"Use dependency injection\",\"summary\":\"Register services for testability\",\"capability_tags\":[\"design-structure\"],\"pattern_tags\":[\"structural-design\"],\"conditions_applies_when\":\"Architecture guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-use-dependency-injection\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=7306884d91661f22a06895ae3321b671bff8980ada75563d9cdf9c189fcdbd0b\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"81775dd6dfdc0c091ce99cbacf0aca42e3e1a865ad04dac7ca3d0a121cb70fc7\"},{\"title\":\"Use dependency injection\",\"summary\":\"Register services with Microsoft.Extensions.DI\",\"capability_tags\":[\"design-structure\"],\"pattern_tags\":[\"structural-design\"],\"conditions_applies_when\":\"Architecture guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-use-dependency-injection\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=574c4e3c5ba240a942a45a162835c241636f705a40053fae91ffe206e3b81e1f\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"76ef5f8cc9de3e3e471c62c06ac2f6743c004e7c46abb0e5280fbc9cf0e507c5\"},{\"title\":\"Use dependency injection\",\"summary\":\"Wire Microsoft.Extensions.Hosting Generic Host in App.OnStartup and resolve ViewModels from the container\",\"capability_tags\":[\"design-structure\"],\"pattern_tags\":[\"structural-design\"],\"conditions_applies_when\":\"Architecture guidance for wpf current.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-wpf-use-dependency-injection\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/wpf.csv\",\"rowKey\":\"path=stacks/wpf.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=e045bf1b8164031577eecb998068d7f489b0f827a2b56c71e83ea90bdc6d6962\",\"rawSha256\":\"9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"},\"sourceLabel\":\"wpf current\",\"applicability\":{\"frameworks\":[{\"name\":\"wpf\",\"sourceLabel\":\"wpf current\"}],\"requiredContext\":[\"framework:wpf\"]},\"contentSha256\":\"d41bfd22b94ad419db698d3eaa7ed8c23d37bfe30f77e67b063a4e9e2bee0e64\"}]"
---
<!-- sbvf:variant:begin uupm-avalonia-use-dependency-injection -->
# Use dependency injection

Register services in a Microsoft.Extensions.DependencyInjection container during startup before any view is constructed - resolve ViewModels through the provider not via a static ServiceLocator

**Do:** Build the ServiceProvider in BuildAvaloniaApp or OnFrameworkInitializationCompleted then resolve ViewModels from it

**Don't:** Static ServiceLocator or new-ing ViewModels inline in code-behind

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
services.AddSingleton<IDataService, DataService>(); services.AddTransient<MainViewModel>(); var provider = services.BuildServiceProvider(); // wired before windows are created
```

**Bad example:**

```text
ServiceLocator.Current.GetInstance<IDataService>() called from random ViewModels with no registration ordering
```
<!-- sbvf:variant:end uupm-avalonia-use-dependency-injection -->
<!-- sbvf:variant:begin uupm-swiftui-use-dependency-injection -->
# Use dependency injection

Inject dependencies for testing

**Do:** Initialize with dependencies

**Don't:** Hard-coded dependencies

**Applies To:** swiftui current; iOS 16+ baseline; Observation APIs iOS 17+

**Severity:** Medium

**Good example:**

```text
init(service: ServiceProtocol)
```

**Bad example:**

```text
let service = RealService()
```
<!-- sbvf:variant:end uupm-swiftui-use-dependency-injection -->
<!-- sbvf:variant:begin uupm-uno-use-dependency-injection -->
# Use dependency injection

Register services for testability

**Do:** Microsoft.Extensions.DI through Uno.Extensions

**Don't:** Static service locators and singletons

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
services.AddSingleton<IApiService, ApiService>();
```

**Bad example:**

```text
ApiService.Instance or new ApiService() in ViewModels
```
<!-- sbvf:variant:end uupm-uno-use-dependency-injection -->
<!-- sbvf:variant:begin uupm-uwp-use-dependency-injection -->
# Use dependency injection

Register services for testability

**Do:** Microsoft.Extensions.DI for service resolution

**Don't:** Static singletons and manual construction

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
services.AddTransient<MainViewModel>(); services.AddSingleton<IDataService, DataService>();
```

**Bad example:**

```text
DataService.Instance or new DataService() everywhere
```
<!-- sbvf:variant:end uupm-uwp-use-dependency-injection -->
<!-- sbvf:variant:begin uupm-winui-use-dependency-injection -->
# Use dependency injection

Register services with Microsoft.Extensions.DI

**Do:** IServiceProvider for ViewModel and service resolution

**Don't:** new ViewModel() and new Service() everywhere

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
services.AddTransient<MainViewModel>(); services.AddSingleton<IDataService, DataService>();
```

**Bad example:**

```text
new MainViewModel(new DataService()) in code-behind
```
<!-- sbvf:variant:end uupm-winui-use-dependency-injection -->
<!-- sbvf:variant:begin uupm-wpf-use-dependency-injection -->
# Use dependency injection

Wire Microsoft.Extensions.Hosting Generic Host in App.OnStartup and resolve ViewModels from the container

**Do:** Generic Host with Microsoft.Extensions.DependencyInjection

**Don't:** new Service() in ViewModel constructors

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
services.AddTransient<MainViewModel>();
```

**Bad example:**

```text
new MainViewModel(new DataService()) in App.xaml.cs
```
<!-- sbvf:variant:end uupm-wpf-use-dependency-injection -->
