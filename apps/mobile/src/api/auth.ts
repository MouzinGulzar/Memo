import api from "./axios";

export interface SignUpPayload {
  name: string;
  phone: string;
  password: string;
}

export interface SignInPayload {
  phone: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
  };
}

export const signUp = (data: SignUpPayload) =>
  api.post<AuthResponse>("/auth/signup", data);

export const signIn = (data: SignInPayload) =>
  api.post<AuthResponse>("/auth/signin", data);
