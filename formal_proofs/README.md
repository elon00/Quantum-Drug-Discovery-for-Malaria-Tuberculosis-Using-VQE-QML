# Formal Mathematical Invariants (Lean 4)

This repository contains formal mathematical proofs verified with the **Lean 4 Proof Assistant**.

### Verified Invariant Theorems:
1. `pqc_dh_exponent_commutativity`: Formal proof that quantum-resistant key exchange exponentiation commutes: \((g^a)^b = (g^b)^a\).
2. `sovereign_state_transition_deterministic`: Formal proof that identical state transitions yield deterministic states.
3. `reentrancy_mutex_safe`: Formal verification of mutex lock states against reentrancy attacks.
4. `pqc_modular_identity`: Formal identity for base modular lattice arithmetic.

### Local Verification:
```powershell
lean formal_proofs/PqcInvariants.lean
```
Or via Lake:
```powershell
cd formal_proofs
lake build
```
