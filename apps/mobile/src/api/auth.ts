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

export interface ApiUser {
  id: string;
  name: string;
  phone: string;
  apiKey: string;
  createdAt: string;
}

export interface AuthResponse {
  user: ApiUser;
}

export const signUp = (data: SignUpPayload) =>
  api.post<AuthResponse>("/auth/signup", data);

export const signIn = (data: SignInPayload) =>
  api.post<AuthResponse>("/auth/signin", data);

export const signOut = () => api.post("/auth/logout");
