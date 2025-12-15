import axios from "axios";

const http = axios.create({
  baseURL: "/pos-api",
  withCredentials: true,
});

export default http;
