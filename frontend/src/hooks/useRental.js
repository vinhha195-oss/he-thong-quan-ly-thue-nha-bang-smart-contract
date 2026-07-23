import { useContext } from "react";
import { RentalContext } from "../context/RentalContext.jsx";

export function useRental() {
  const ctx = useContext(RentalContext);
  if (!ctx) throw new Error("useRental phải được gọi bên trong <RentalProvider>");
  return ctx;
}
