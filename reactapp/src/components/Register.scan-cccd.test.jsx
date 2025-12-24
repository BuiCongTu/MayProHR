import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Register from "./Register";
import * as formDataService from "../services/formDataService";

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

    await waitFor(() => expect(formDataService.getDepartments).toHaveBeenCalledTimes(1));

    const input = screen.getByLabelText("cccd-file");
    const file = new File(["dummy"], "cccd.png", { type: "image/png" });
    await userEvent.upload(input, file);

    await waitFor(() => expect(formDataService.scanCCCD).toHaveBeenCalledTimes(1));

    const fullNameInput = await screen.findByLabelText(/full name/i);
    await waitFor(() => expect(fullNameInput).toHaveValue("Nguyen Van A"));

    // Gender: male -> "true" (theo code map trong Register.jsx)
    const genderCombo = screen.getByRole("combobox", { name: /gender/i });
    await waitFor(() => expect(genderCombo).toHaveValue("true"));
  });
});
