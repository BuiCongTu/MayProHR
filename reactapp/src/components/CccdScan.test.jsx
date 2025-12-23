import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CccdScan from "./CccdScan";

jest.mock("../services/cccdService", () => ({
  scanCccd: jest.fn(),
}));

import { scanCccd } from "../services/cccdService";

describe("CccdScan", () => {
  beforeAll(() => {
    // JSDOM may not implement this
    global.URL.createObjectURL = jest.fn(() => "blob:mock");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uploads file, calls API, and triggers onSuccess", async () => {
    const onSuccess = jest.fn();

    scanCccd.mockResolvedValue({ fullName: "TEST", gender: "male", dob: "1993-12-04" });

    render(<CccdScan onSuccess={onSuccess} />);

    const label = screen.getByText(/quét cccd/i).closest("label");
    const input = label?.querySelector("input[type='file']");
    expect(input).toBeInTheDocument();

    const file = new File(["dummy"], "cccd.png", { type: "image/png" });
    await userEvent.upload(input, file);

    await waitFor(() => expect(scanCccd).toHaveBeenCalledTimes(1));
    expect(scanCccd).toHaveBeenCalledWith(file);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith({ fullName: "TEST", gender: "male", dob: "1993-12-04" });

    expect(await screen.findByText(/quét cccd thành công/i)).toBeInTheDocument();
  });

  it("shows error snackbar when API fails", async () => {
    const onSuccess = jest.fn();

    scanCccd.mockRejectedValue(new Error("boom"));

    render(<CccdScan onSuccess={onSuccess} />);

    const label = screen.getByText(/quét cccd/i).closest("label");
    const input = label?.querySelector("input[type='file']");
    const file = new File(["dummy"], "cccd.png", { type: "image/png" });
    await userEvent.upload(input, file);

    await waitFor(() => expect(scanCccd).toHaveBeenCalledTimes(1));
    expect(onSuccess).not.toHaveBeenCalled();

    expect(await screen.findByText(/quét cccd thất bại/i)).toBeInTheDocument();
  });
});
