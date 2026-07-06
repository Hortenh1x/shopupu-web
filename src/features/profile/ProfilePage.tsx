"use client";

import { useState } from "react";
import { Protected } from "@/components/layout/Protected";
import { AddressBook } from "@/features/profile/AddressBook";
import { ConsentsPanel } from "@/features/profile/ConsentsPanel";
import { ProfileForm } from "@/features/profile/ProfileForm";
import { SecurityPanel } from "@/features/profile/SecurityPanel";
import { WishlistPanel } from "@/features/profile/WishlistPanel";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "addresses", label: "Addresses" },
  { id: "wishlist", label: "Wishlist" },
  { id: "consents", label: "Consents" },
  { id: "security", label: "Security & data" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ProfilePage() {
  const [tab, setTab] = useState<TabId>("profile");

  return (
    <Protected>
      <main className="page">
        <h1 className="title">My account</h1>
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          {TABS.map((item) => (
            <button
              key={item.id}
              className={item.id === tab ? "button buttonDark" : "button"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <section className="section">
          {tab === "profile" ? <ProfileForm /> : null}
          {tab === "addresses" ? <AddressBook /> : null}
          {tab === "wishlist" ? <WishlistPanel /> : null}
          {tab === "consents" ? <ConsentsPanel /> : null}
          {tab === "security" ? <SecurityPanel /> : null}
        </section>
      </main>
    </Protected>
  );
}
