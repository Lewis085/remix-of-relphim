import { useEffect, useState } from "react";

const INITIAL_AMOUNT = 187241.5;
const INITIAL_SUPPORTERS = 2843;

type State = { arrecadado: number; apoiadores: number };

let state: State = { arrecadado: INITIAL_AMOUNT, apoiadores: INITIAL_SUPPORTERS };
const listeners = new Set<(s: State) => void>();

const emit = () => listeners.forEach((l) => l(state));

export const addDonation = (amount: number) => {
  state = {
    arrecadado: state.arrecadado + amount,
    apoiadores: state.apoiadores + 1,
  };
  emit();
};

export const useDonationTotals = () => {
  const [s, setS] = useState<State>(state);
  useEffect(() => {
    listeners.add(setS);
    setS(state);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
};
