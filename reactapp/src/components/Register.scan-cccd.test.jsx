import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Register from "./Register";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("../services/authService", () => ({
  getCurrentUser: jest.fn(() => ({ roleName: "Admin" })),
}));

jest.mock("../services/formDataService", () => ({
  getDepartments: jest.fn(async () => []),
  getRoles: jest.fn(async () => [{ id: 1, name: "HR" }]),
  getSkillLevels: jest.fn(async () => []),
  scanCCCD: jest.fn(),
}));

import * as formDataService from "../services/formDataService";

describe("Register - Scan CCCD button", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uploads image and fills fullName + gender from API", async () => {
    formDataService.scanCCCD.mockResolvedValue({
      data: {
        fullName: "Nguyen Van A",
        gender: "male",
      },
    });

    render(<Register />);

    // Wait for initial async option loads to settle
    await waitFor(() => expect(formDataService.getDepartments).toHaveBeenCalledTimes(1));

    const scanButton = screen.getByRole("button", { name: /scan cccd/i });
    const input = scanButton.querySelector("input[type='file']");
    expect(input).toBeInTheDocument();

    const file = new File(["dummy"], "cccd.png", { type: "image/png" });
    await userEvent.upload(input, file);

    await waitFor(() => expect(formDataService.scanCCCD).toHaveBeenCalledTimes(1));

    // Full Name should be populated
    const fullNameInput = await screen.findByLabelText(/full name/i);
    await waitFor(() => expect(fullNameInput).toHaveValue("Nguyen Van A"));

    // Gender should map male -> "true"
    const genderHiddenInput = document.querySelector("input[name='gender']");
    await waitFor(() => expect(genderHiddenInput).toHaveValue("true"));

    const genderCombo = screen.getByRole("combobox", { name: /gender/i });
    expect(genderCombo).toHaveTextContent(/male/i);
  });
});
