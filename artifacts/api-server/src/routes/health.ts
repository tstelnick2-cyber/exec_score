import express from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

export default express.Router().get("/", (_req, res) => {
  res.json(HealthCheckResponse.parse({ status: "ok" }));
});
