"use server";

// ── Barrel re-exports ──────────────────────────────────────────────────────
// This file re-exports all server actions from their domain modules.
// Components should import directly from the domain files
// (e.g. ../app/baby-actions.js) to keep Turbopack HMR stable.

export { loginAction, logoutAction, signupAction, updateLocaleAction } from "./auth-actions.js";
export {
  createBabyAction,
  deleteBabyAction,
  leaveBabyAction,
  updateBabyAction,
} from "./baby-actions.js";
export {
  addDiaperEntryAction,
  deleteDiaperEntryAction,
  updateDiaperEntryAction,
} from "./diaper-actions.js";
export {
  addGrowthEntryAction,
  deleteGrowthEntryAction,
  updateGrowthEntryAction,
} from "./growth-actions.js";
export { acceptInviteAction, createInviteAction } from "./invite-actions.js";
export {
  addMedicationEntryAction,
  addPredefinedMedicationAction,
  deleteMedicationEntryAction,
  deletePredefinedMedicationAction,
  updateMedicationEntryAction,
  updatePredefinedMedicationAction,
} from "./medication-actions.js";
export {
  addMilkAction,
  deleteMilkAction,
  startMilkAction,
  updateMilkAction,
} from "./milk-actions.js";
export {
  addTemperatureEntryAction,
  deleteTemperatureEntryAction,
  updateTemperatureEntryAction,
} from "./temperature-actions.js";
