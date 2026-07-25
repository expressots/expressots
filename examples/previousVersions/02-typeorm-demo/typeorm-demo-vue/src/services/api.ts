import { ROUTE_NAMES } from "@/enums";
import { UserService } from "@/services";
import axios, { type AxiosRequestConfig } from "axios";

const env = import.meta.env;

const BASE_URL = env.VITE_API_URL;

const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// @ts-ignore
/*
instance.interceptors.request.use((config) => {
  let user: UserAuthType | string | null = localStorage.getItem(
    UserService.USER_KEY
  );

  try {
    if (user) {
      user = JSON.parse(user);
      isUserAuthType(user);

      return {
        ...config,

        headers: {
          ...config.headers,
          Authorization: `Bearer ${user.access_token}`,
        },
      };
    }
  } catch (e) {
    const error = e as unknown as Error;

    console.error("api", error.name, error.message);

    return config;
  }

  return config;
});
*/

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      UserService.logout({ redirect_to: ROUTE_NAMES.HOME });
    }

    return Promise.reject(error);
  }
);

function del<T>(url: string, data?: any, config: AxiosRequestConfig = {}) {
  config.data = data;

  return instance.delete<T>(url, config);
}

export default {
  get: instance.get,
  post: instance.post,
  put: instance.put,
  del,
};
