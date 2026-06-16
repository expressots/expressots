import type { UserConfig } from "@commitlint/types";

const Configuration: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-max-length": [0],
    "body-max-line-length": [0],
    "header-max-length": [0],
  },
};

export default Configuration;
