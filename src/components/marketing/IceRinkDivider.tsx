import React from "react";

interface IceRinkDividerProps {
  color: "blue" | "red";
}

export function IceRinkDivider({ color }: IceRinkDividerProps) {
  const lineColor = color === "blue" ? "#1F4FD8" : "#D72638";

  return (
    <div className="relative w-full h-16 my-8">
      {/* Main thick line */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3"
        style={{ backgroundColor: lineColor }}
      />

      {/* Thin shadow lines above and below for depth */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 -mt-5 h-px opacity-30"
        style={{ backgroundColor: lineColor }}
      />
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 mt-5 h-px opacity-30"
        style={{ backgroundColor: lineColor }}
      />
    </div>
  );
}
