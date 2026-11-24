import LeanVerify.Types
import LeanVerify.Transitions

namespace LeanVerify

-- Invariant 1: Withdrawing valid funds strictly conserves total value
theorem withdraw_conserves_funds (w : Wallet) (amount : Nat) (h : amount ≤ w.balance) :
    (withdraw w amount).balance + amount = w.balance := by
  unfold withdraw
  exact Nat.sub_add_cancel h

-- Invariant 2: Depositing followed by withdrawing the exact amount restores original balance
theorem deposit_withdraw_identity (w : Wallet) (amount : Nat) :
    (withdraw (deposit w amount) amount).balance = w.balance := by
  unfold withdraw deposit
  exact Nat.add_sub_cancel w.balance amount

end LeanVerify
