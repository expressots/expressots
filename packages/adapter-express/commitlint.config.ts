import type { UserConfig } from '@commitlint/types'

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Increase header max length from default 100 to 200
    'header-max-length': [2, 'always', 200],
    // Increase body max line length from default 72 to 200
    'body-max-line-length': [2, 'always', 200],
  },
}

export default Configuration