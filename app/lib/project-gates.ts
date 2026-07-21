type ViabilityProject = {
  viability: "pending" | "pass" | "fail" | "caveat";
};

export function viabilityActionBlockedReason(
  project: ViabilityProject,
  action: "publish" | "design" | "deliverable"
): string | null {
  const label = action === "publish" ? "publish the handover" : action === "design" ? "generate design proposals" : "create the final deliverable";
  if (project.viability === "pending") {
    return `Complete the viability review before you ${label}.`;
  }
  if (project.viability === "fail") {
    return `This project did not pass the viability gate. Add a documented override before you ${label}.`;
  }
  return null;
}
