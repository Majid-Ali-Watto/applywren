// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import RecipientInput, { mergeEmails } from "@/components/RecipientInput";

afterEach(cleanup);

function Harness({ onChange = () => {} }) {
  const [emails, setEmails] = useState([]);
  return (
    <RecipientInput
      id="to"
      emails={emails}
      onChange={(next) => {
        setEmails(next);
        onChange(next);
      }}
      placeholder="Add emails"
    />
  );
}

describe("RecipientInput", () => {
  test("mergeEmails adds new addresses once, ignoring case", () => {
    expect(mergeEmails(["a@x.com"], ["A@x.com", "b@x.com", " ", "b@x.com"])).toEqual(["a@x.com", "b@x.com"]);
  });

  test("Enter adds the typed address as a chip; Backspace removes the last", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByPlaceholderText("Add emails");
    fireEvent.change(input, { target: { value: "jane@x.com" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("jane@x.com")).toBeTruthy();

    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.queryByText("jane@x.com")).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  test("pasting a list adds every address and flags invalid ones", () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText("Add emails");
    fireEvent.paste(input, { clipboardData: { getData: () => "a@x.com, b@y.com\nnot-an-email" } });
    expect(screen.getByText("a@x.com")).toBeTruthy();
    expect(screen.getByText("b@y.com")).toBeTruthy();
    expect(screen.getByText("not-an-email").closest("span[title]").title).toBe("Not a valid email address");
  });
});
