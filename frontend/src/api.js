import axios from "axios";

export const API = axios.create({
  baseURL: "https://pearl-court-backend.onrender.com/api",
  timeout: 60000,
});