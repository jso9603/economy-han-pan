"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginTop: "100px" }}
    >
      <button
        onClick={() => signIn("kakao", { callbackUrl: "/" })}
        style={{
          backgroundColor: "#FEE500",
          color: "#000",
          border: "none",
          borderRadius: "8px",
          padding: "12px 24px",
          fontSize: "16px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        카카오로 로그인
      </button>
    </div>
  );
}
