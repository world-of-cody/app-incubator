export const VALIDATION_MESSAGE_CODES = [
  "NOT_ABSOLUTE",
  "PATH_FORMAT",
  "NOT_FOUND",
  "NOT_DIRECTORY",
  "READ_ONLY",
  "PERMISSION_DENIED",
  "MISSING_FOLDERS",
  "NO_AGENTS",
  "OUTSIDE_HOME",
  "AGENTS_ROOT_MISSING",
  "SAFETY_ACK_REQUIRED",
] as const;

export type ValidationMessageCode = (typeof VALIDATION_MESSAGE_CODES)[number];

export type ValidationMessage = {
  code: ValidationMessageCode;
  message: string;
};
