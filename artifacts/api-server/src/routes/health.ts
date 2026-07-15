import express from "express";

export default express.Router().get("/", (_req, res) => {
  res.json({ status: "ok" });
});
