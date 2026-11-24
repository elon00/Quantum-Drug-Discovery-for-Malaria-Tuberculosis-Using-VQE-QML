import Lake
open Lake DSL

package "pqc_invariants" where
  version := v!"0.1.0"

@[default_target]
lean_lib "PqcInvariants" where
  srcDir := "."
