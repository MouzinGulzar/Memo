import api from "./axios";

export interface PhoneNumber {
  id: string;
  phone: string;
  label?: string;
  createdAt: string;
}

export const getPhoneNumbers = () =>
  api.get<{ phoneNumbers: PhoneNumber[] }>("/phone-numbers");

export const addPhoneNumbers = (
  phoneNumbers: { phone: string; label?: string }[],
) => api.post("/phone-numbers", { phoneNumbers });

export const deletePhoneNumber = (id: string) =>
  api.delete(`/phone-numbers/${id}`);
