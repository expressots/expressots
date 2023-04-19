import { ROUTE_NAMES } from "@/enums";
import { getRoutePath } from "@/router";
// import type { UserType } from "@/types";
// import { isUserType } from "@/types";

const USER_KEY = "user-credentials";

interface LogoutProps {
  redirect_to?: ROUTE_NAMES | null;
}

function logout({ redirect_to = null }: LogoutProps = {}) {
  localStorage.removeItem(USER_KEY);

  const defaultPath: string = getRoutePath(ROUTE_NAMES.HOME)!;
  const redirectPath: string | null = redirect_to && getRoutePath(redirect_to);

  location.replace(redirectPath || defaultPath);
}

// async function load(): Promise<UserType | undefined> {
//   let data: UserType | string | null = localStorage.getItem(USER_KEY);

//   if (typeof data === "string") {
//     data = JSON.parse(data);

//     if (isUserType(data)) {
//       return data;
//     }
//   }

//   return undefined;
// }

export default {
  USER_KEY,

  logout,
  // load,
};
