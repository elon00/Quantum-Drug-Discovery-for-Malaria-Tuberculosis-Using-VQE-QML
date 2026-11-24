import LeanVerify.Types

namespace LeanVerify

def withdraw (w : Wallet) (amount : Nat) : Wallet :=
  { balance := w.balance - amount }

def deposit (w : Wallet) (amount : Nat) : Wallet :=
  { balance := w.balance + amount }

end LeanVerify
