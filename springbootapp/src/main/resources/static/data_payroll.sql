-- ===============================================
-- SEED DATA FOR PAYROLL MODULE (December 2025)
-- ===============================================

-- 1. INSERT TAX BRACKETS (Bậc thuế 2026)
INSERT INTO tbTaxBracket (bracket_number, from_income, to_income, tax_rate, description, is_active, created_at)
VALUES
    (1, 0, 10000000, 5.00, 'Bracket 1: 0-10M @ 5%', 1, GETDATE()),
    (2, 10000000, 30000000, 10.00, 'Bracket 2: 10-30M @ 10%', 1, GETDATE()),
    (3, 30000000, 60000000, 20.00, 'Bracket 3: 30-60M @ 20%', 1, GETDATE()),
    (4, 60000000, 100000000, 30.00, 'Bracket 4: 50-75M @ 30%', 1, GETDATE()),
    (5, 100000000, 999999999999, 35.00, 'Bracket 5: >100M @ 35%', 1, GETDATE());

-- 2. INSERT TAX DEDUCTIONS (Giảm trừ 2026)
INSERT INTO tbTaxDeduction (deduction_type, deduction_amount, description, is_active, applicable_from, applicable_to, created_at)
VALUES
    ('PERSONAL', 15500000, 'Personal allowance', 1, '2026-01-01', '2026-12-31', GETDATE()),
    ('DEPENDENT', 6200000, 'Dependent allowance (per person)', 1, '2026-01-01', '2026-12-31', GETDATE());

-- 3. INSERT HOLIDAYS (Ngày lễ Việt Nam 2025)
INSERT INTO tbHoliday (holiday_date, holiday_name, is_paid)
VALUES
    ('2025-01-01', 'New Years Day', 1),
    ('2025-01-29', 'Lunar New Year Day 1', 1),
    ('2025-01-30', 'Lunar New Year Day 2', 1),
    ('2025-01-31', 'Lunar New Year Day 3', 1),
    ('2025-04-07', 'Hung Vuong King death anniversary', 1),
    ('2025-04-30', 'Southern Liberation Day, National Reunification Day', 1),
    ('2025-05-01', 'International Labor Day', 1),
    ('2025-09-02', 'Vietnam National Day', 1);

-- 4. INSERT TEST USERS (TimeBased & ProductBased)
-- Giả sử bạn đã có department_id=1, role_id=3 (Worker)

INSERT INTO tbUser (full_name, email, phone, gender, role_id, department_id, line_id, skill_level_id, salary_type, base_salary, hire_date, status, created_at)
VALUES ('Ba C - TimeBased', 'ba.c@company.com', '0901234567', 0, 3, 1, NULL, NULL, 'TimeBased', 40000000, '2025-09-01', 'Active', GETDATE());

INSERT INTO tbUser (full_name, email, phone, gender, role_id, department_id, line_id, skill_level_id, salary_type, base_salary, hire_date, status, created_at)
VALUES ('Nguyen Van A - ProductBased', 'a.nguyen@company.com', '0901234568', 1, 3, 1, 1, NULL, 'ProductBased', 20000000, '2025-09-15', 'Active', GETDATE());

INSERT INTO tbUser (full_name, email, phone, gender, role_id, department_id, line_id, skill_level_id, salary_type, base_salary, hire_date, status, created_at)
VALUES ('Tran Thi B - TimeBased', 'b.tran@company.com', '0901234569', 0, 3, 1, NULL, NULL, 'TimeBased', 18000000, '2025-08-20', 'Active', GETDATE());

-- 5. INSERT EMPLOYEE TAX PROFILES
INSERT INTO tbEmployeeTaxProfile (user_id, number_of_dependents, insurance_rate, is_eligible_for_personal_deduction, is_eligible_for_dependent_deduction, note, created_at)
VALUES (1, 1, 10.5, 1, 1, 'Ba C - 1 nguoi phu thuoc', GETDATE());

INSERT INTO tbEmployeeTaxProfile (user_id, number_of_dependents, insurance_rate, is_eligible_for_personal_deduction, is_eligible_for_dependent_deduction, note, created_at)
VALUES (2, 0, 10.5, 1, 1, 'Nguyen Van A - Khong co nguoi phu thuoc', GETDATE());

INSERT INTO tbEmployeeTaxProfile (user_id, number_of_dependents, insurance_rate, is_eligible_for_personal_deduction, is_eligible_for_dependent_deduction, note, created_at)
VALUES (3, 2, 10.5, 1, 1, 'Tran Thi B - 2 nguoi phu thuoc', GETDATE());

-- 6. INSERT ATTENDANCE DATA (Tháng 12/2025)
INSERT INTO tbAttendance (user_id, date, check_in_time, check_out_time, status, created_at)
VALUES
    (1, '2025-12-01', '08:05:00', '17:00:00', 'LATE', GETDATE()),
    (1, '2025-12-02', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-03', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-04', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-05', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-08', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-09', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-10', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-11', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-12', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-15', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-16', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-17', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-18', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-19', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-22', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-23', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-24', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-25', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-26', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-29', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-30', '08:00:00', '17:00:00', 'PRESENT', GETDATE()),
    (1, '2025-12-31', '08:00:00', '17:00:00', 'PRESENT', GETDATE());

-- 7. INSERT LEAVE REQUEST DATA (Tháng 12/2025)
INSERT INTO tbLeaveRequest (user_id, leave_reason_id, start_date, end_date, status, created_at)
VALUES (1, 1, '2025-12-13', '2025-12-14', 'approved', GETDATE());

-- 8. INSERT PRODUCTION DATA (Tháng 12/2025)
INSERT INTO tbProduction (id, department_id, product_count, DOP, unit_price, created_at)
VALUES (1, 1, 100, '2025-12-15', 50000, GETDATE());

-- 9. INSERT PRODUCTION LINE (Liên kết Production với Subline)
INSERT INTO tbProductionLine (production_id, line_id, subline_id, count_contribution, total_working_hours, created_at)
VALUES (1, 1, 1, 100, 208, GETDATE());

-- 10. INSERT OVERTIME REQUEST DATA (Tháng 12/2025)
INSERT INTO tbOvertimeRequest (request_id, department_id, overtime_date, start_time, end_time, overtime_time, reason, status, created_at)
VALUES (1, 1, '2025-12-13', '18:00:00', '22:00:00', 4, 'Emergency project', 'approved', GETDATE());

-- 11. INSERT OVERTIME TICKET (Vé tăng ca)
INSERT INTO tbOvertimeTicket (ticket_id, request_id, status, created_at)
VALUES (1, 1, 'approved', GETDATE());

-- 12. INSERT OVERTIME TICKET EMPLOYEE (Nhân viên tăng ca)
INSERT INTO tbOvertimeTicketEmployee (overtime_ticket_id, user_id, line_id, status, ticket_date, created_at)
VALUES (1, 1, NULL, 'accepted', '2025-12-13', GETDATE());

-- 13. INSERT PAYROLL (Bảng lương tháng 12/2025)
INSERT INTO tbPayroll (id, month, department_id, total_salary, details, status, year_month, created_by, approved_by, balance_note, created_at)
VALUES (1, '2025-12-01', 1, 0, NULL, 'pending', '2025-12', 2, NULL, NULL, GETDATE());

-- 14. INSERT EMPLOYEE PAYROLL (Chi tiết lương từng nhân viên)
INSERT INTO tbEmployeePayroll (payroll_id, user_id, base_salary, product_bonus, overtime_pay, allowance, deduction, total_pay, note, created_at)
VALUES (1, 1, 40000000, 0, 1363636, 0, 4250000, 36150000, 'TimeBased - 1 lan muon, 2 ngay nghi, 4 gio OT', GETDATE());

INSERT INTO tbEmployeePayroll (payroll_id, user_id, base_salary, product_bonus, overtime_pay, allowance, deduction, total_pay, note, created_at)
VALUES (1, 2, 20000000, 5000000, 0, 0, 2100000, 22400000, 'ProductBased - 100 san pham @ 50k', GETDATE());

INSERT INTO tbEmployeePayroll (payroll_id, user_id, base_salary, product_bonus, overtime_pay, allowance, deduction, total_pay, note, created_at)
VALUES (1, 3, 18000000, 0, 0, 0, 1890000, 15810000, 'TimeBased - No issues', GETDATE());

-- ===============================================
-- VERIFY DATA
-- ===============================================
SELECT 'Users' as Entity, COUNT(*) as Count FROM tbUser WHERE id IN (1,2,3);
SELECT 'Tax Brackets' as Entity, COUNT(*) as Count FROM tbTaxBracket;
SELECT 'Tax Deductions' as Entity, COUNT(*) as Count FROM tbTaxDeduction;
SELECT 'Holidays' as Entity, COUNT(*) as Count FROM tbHoliday;
SELECT 'Attendance Records' as Entity, COUNT(*) as Count FROM tbAttendance WHERE user_id IN (1,2,3);
SELECT 'Leave Requests' as Entity, COUNT(*) as Count FROM tbLeaveRequest WHERE user_id IN (1,2,3);
SELECT 'Production Records' as Entity, COUNT(*) as Count FROM tbProduction;
SELECT 'Payroll Records' as Entity, COUNT(*) as Count FROM tbPayroll;
SELECT 'Employee Payroll' as Entity, COUNT(*) as Count FROM tbEmployeePayroll;