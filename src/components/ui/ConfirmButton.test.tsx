import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

describe("ConfirmButton", () => {
  it("arms in place and only fires on the explicit second choice", () => {
    const onConfirm = vi.fn();
    render(<ConfirmButton label="Delete" confirmLabel="Yes, delete" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Yes, delete" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("disarms on Escape", () => {
    const onConfirm = vi.fn();
    render(<ConfirmButton label="Cancel order" confirmLabel="Yes, cancel" keepLabel="Keep order" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Yes, cancel" }), { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Yes, cancel" })).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
