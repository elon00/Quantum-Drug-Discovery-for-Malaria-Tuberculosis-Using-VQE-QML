import Lake
open Lake DSL

package «lean_verify» where
  moreServerArgs := #["-DautoImplicit=false"]

@[default_target]
lean_lib «LeanVerify» where
  srcDir := "."
