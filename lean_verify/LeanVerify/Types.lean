namespace LeanVerify

structure Wallet where
  balance : Nat
  deriving Repr, DecidableEq

structure ProtocolState where
  totalSupply : Nat
  vaultBalance : Nat
  deriving Repr, DecidableEq

end LeanVerify
