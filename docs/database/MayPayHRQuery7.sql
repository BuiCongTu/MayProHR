-- CREATE DATABASE MayPayHR7;
-- GO

USE MayPayHR7;
GO

-- =============================================
-- 1. tbRole - Vai trò
-- =============================================
CREATE TABLE tbRole (
    role_id INT IDENTITY(1000,1) PRIMARY KEY, 
    [name] VARCHAR(100) UNIQUE NOT NULL,
    [description] TEXT
);
GO

INSERT INTO tbRole (name, description) VALUES
('Admin', 'Administrator / Quản trị viên hệ thống'),
('HR', 'Human Resources / Nhân sự, quản lý hồ sơ, lịch sử'),
('Factory Director', 'Factory Director / Giám đốc nhà máy, duyệt cuối cùng'),
('Factory Manager', 'Factory Manager / Quản lý nhà máy, duyệt đơn, tăng ca'),
('Manager', 'Line/Department Manager / Quản lý chuyền, quản lý Line'),
('Leader', 'Leader / Tổ trưởng quản lý Section'),
('Assistant Leader', 'Assistant Leader / Tổ phó quản lý Section'),
('Worker', 'Worker / Công nhân trực tiếp sản xuất (may, KCS, hoàn thành)')
GO

-- =============================================
-- 2. tbLeaveReason - Lý do nghỉ
-- =============================================
CREATE TABLE tbLeaveReason (
    leave_reason_id INT IDENTITY(1000,1) PRIMARY KEY, 
    reason VARCHAR(255) NOT NULL,                     -- Lý do nghỉ ngắn gọn
    [description] TEXT                                -- Chi tiết lý do
);
GO

INSERT INTO tbLeaveReason (reason, description) VALUES
('Common Illness/Bệnh thông thường', 'Common Illness / Nghỉ ốm thông thường, nghỉ ốm có giấy bệnh viện, điều trị ngoại trú.'),
('Serious Illness/Bệnh nặng', 'Serious Illness / Nghỉ ốm có giấy khám bệnh viện, điều trị nội trú.'),
('Maternity Leave/Thai sản', 'Maternity Leave / Chế độ thai sản'),
('Personal Leave/Việc riêng', 'Personal Leave / Cưới hỏi, ma chay, việc cá nhân.'),
('Unauthorized Leave/Nghỉ không phép', 'Unauthorized Leave / Nghỉ không xin phép'),
('Annual Leave/Nghỉ phép năm', 'Annual Leave / Nghỉ theo quy định 12 ngày/năm');
GO

-- =============================================
-- 3. tbSkillLevel - Bậc tay nghề
-- =============================================
CREATE TABLE tbSkillLevel (
    skill_level_id INT IDENTITY(1000,1) PRIMARY KEY,  
    [name] VARCHAR(100) NOT NULL,                     -- Tên bậc (Level 1-7)
    [description] TEXT                                -- Mô tả kỹ năng
);
GO

INSERT INTO tbSkillLevel (name, description) VALUES
('Level 1', 'Beginner / Mới vào nghề, cần được hướng dẫn và giám sát chặt chẽ.'),
('Level 2', 'Basic Experience / Kinh nghiệm cơ bản, cần được hướng dẫn thêm'),
('Level 3', 'Solid Experience / Kinh nghiệm vững vàng, đã được đào tạo bài bản'),
('Level 4', 'Senior Worker / Kinh nghiệm lâu năm, hướng dẫn người khác - Leader, Ass. leader'),
('Level 5', 'Expert Worker / Kinh nghiệm lâu năm, xử lý sản phẩm khó'),
('Level 6', 'Sample Maker / Thợ may mẫu, có tay nghề cao và khả năng đọc, hiểu các bản vẽ kỹ thuật phức tạp'),
('Level 7', 'Technical Master / Kỹ thuật may, tay nghề cao, chuyên sâu kỹ thuật may');
GO

-- =============================================
-- 4. tbDepartment - Phòng ban
-- =============================================
CREATE TABLE tbDepartment (
    department_id INT IDENTITY(1000,1) PRIMARY KEY,  
    [name] VARCHAR(100) NOT NULL,                     -- Tên phòng ban
    manager_id INT NULL,                              -- Quản lý phòng ban (FK)
    [description] TEXT                                -- Mô tả công việc
);
GO

INSERT INTO tbDepartment (name, manager_id, description) VALUES
('HR/Hành Chính', NULL, 'Human Resources Department / Thống kê lao động, Y tế, Bảo vệ, Tạp vụ, Tài xế.'),
('Planning/Kế hoạch', NULL, 'Planning / Kế Hoạch sản xuất hàng, Kho nguyên liệu, Kho phụ liệu.'),
('FQC', NULL, 'Final Quality Control / Quản lý chất lượng'),
('Technical/Kỹ thuật', NULL, 'Technical / Kỹ thuật, Cơ điện, LEAN'),
('Production/Sản xuất', NULL, 'Production / Rập mẫu, Tổ cắt, Chuyền may, KCS TW'),
('Finishing Center/Trung tâm hoàn thành', NULL, 'Finishing Center / Tổ hoàn thành 1, tổ hoàn thành 2, tổ hoàn thành 3, Tổ hậu cần, KCS SW, Tổ Xuất hàng');
GO

-- =============================================
-- 5. tbUser - Nhân viên
-- =============================================
CREATE TABLE tbUser (
    user_id INT IDENTITY(1000,1) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    gender bit DEFAULT 0,       -- 0: female 1: male - them moi
    role_id INT,
    department_id INT,
    line_id INT NULL,
    face_data TEXT,
    salary_type VARCHAR(20) DEFAULT 'TimeBased' 
        CHECK (salary_type IN ('ProductBased', 'TimeBased')),
    base_salary DECIMAL(10,2) DEFAULT 0,
    skill_level_id INT,
    hire_date DATE,
    [status] VARCHAR(20) DEFAULT 'Active' 
        CHECK (status IN ('Active', 'Inactive', 'Terminated')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_User_Role FOREIGN KEY (role_id) REFERENCES tbRole(role_id),
    CONSTRAINT FK_User_Department FOREIGN KEY (department_id) REFERENCES tbDepartment(department_id),
    CONSTRAINT FK_User_SkillLevel FOREIGN KEY (skill_level_id) REFERENCES tbSkillLevel(skill_level_id)
);
GO

-- =============================================
-- 6. tbLine - Chuyền/Tổ - sua va them cot parent_id + level
-- =============================================
CREATE TABLE tbLine (
    line_id INT IDENTITY(1000,1) PRIMARY KEY,   
    department_id INT NOT NULL,
    parent_id   INT, -- nội suy line_id để lập thành word unit
    [level]       INT, -- tầng quản lý bắt đàu từ leval3( sub section)
    [name] VARCHAR(100) NOT NULL,                      -- Tên chuyền
    [description] TEXT,                                -- Mô tả
    manager_id INT NULL,                               -- Quản lý chuyền
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,     

    CONSTRAINT FK_Line_Department FOREIGN KEY (department_id) REFERENCES tbDepartment(department_id),
    CONSTRAINT FK_Line_Manager FOREIGN KEY (manager_id) REFERENCES tbUser(user_id),
    CONSTRAINT UQ_Line_Name_Dept UNIQUE (department_id, name),
    CONSTRAINT [FK_Line_Parent] FOREIGN KEY ([parent_id]) REFERENCES [dbo].[tbLine] ([line_id])
);
GO

-- Tạo line trong deparment
DECLARE @DeptHoanThanh INT = (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành');

INSERT INTO tbLine (department_id,parent_id,[level], [name], [description], manager_id) VALUES
(@DeptHoanThanh,null,3, N'Operations/ Vận hành', N'Bộ phận Vận Hành trực thuộc Finishing Center', null),
(@DeptHoanThanh,null,3, N'Delivery/ Giao hàng', N'Bộ phận Xuất Hàng trực thuộc Finishing Center', null)
GO

-- Tạo section trong line
-----------------
DECLARE @DeptHoanThanh INT = (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành');
DECLARE @line1 INT = (SELECT line_id FROM tbLine WHERE name = 'Operations/ Vận hành');
DECLARE @line2 INT = (SELECT line_id FROM tbLine WHERE name = 'Delivery/ Giao hàng');

INSERT INTO tbLine (department_id,parent_id,[level], [name], [description], manager_id) VALUES
(@DeptHoanThanh,@line1,4, N'Finishing/ Tổ Hoàn Thành', N'Tổ Hoàn Thành Sản Phẩm, trực thuộc Bộ phận Vận Hành.', null),
(@DeptHoanThanh,@line1,4, N'Warehouse/ Tổ Hậu Cần', N'Tổ Hậu Cầu, trực thuộc Bộ phận Vận Hành.', null),
(@DeptHoanThanh,@line1,4, N'KCS SW/ Tổ KCS', N'Tổ Kiểm tra chất lượng sản phẩm tại chỗ, trực thuộc Bộ phận Vận Hành.', null),
(@DeptHoanThanh,@line2,4, N'Planing Local/ Kế Hoạch', N'Tổ Kế Hoạch Xuất Hàng, trực thuộc Bộ phận Xuất Hàng.', null)
GO

--tạo word unit trong  section
DECLARE @DeptHoanThanh INT = (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành');
DECLARE @section1 INT = (SELECT line_id FROM tbLine WHERE name = 'Finishing/ Tổ Hoàn Thành');
DECLARE @section2 INT = (SELECT line_id FROM tbLine WHERE name = 'Warehouse/ Tổ Hậu Cần');
DECLARE @section3 INT = (SELECT line_id FROM tbLine WHERE name = 'KCS SW/ Tổ KCS');
DECLARE @section4 INT = (SELECT line_id FROM tbLine WHERE name = 'Planing Local/ Kế Hoạch');

INSERT INTO tbLine (department_id,parent_id,[level], [name], [description], manager_id) VALUES
(@DeptHoanThanh,@section1,5, N'Sewing Programming', N'Công đoạn May lập trình, trực thuộc tổ Hoàn Thành Sản Phẩm.', null),
(@DeptHoanThanh,@section1,5, N'Passant', N'Công đoạn Cắt chỉ, trực thuộc tổ Hoàn Thành Sản Phẩm.', null),
(@DeptHoanThanh,@section1,5, N'Rivet', N'Công đoạn Đóng nút, trực thuộc tổ Hoàn Thành Sản Phẩm.', null),
(@DeptHoanThanh,@section1,5, N'Label Attaching', N'Công đoạn Đóng nhãn, trực thuộc tổ Hoàn Thành Sản Phẩm.', null),
(@DeptHoanThanh,@section1,5, N'Dust Cleaning', N'Công đoạn Hút bụi thành phẩm, trực thuộc tổ Hoàn Thành Sản Phẩm.', null),
(@DeptHoanThanh,@section1,5, N'Ironing', N'Công đoạn Ủi thành phẩm, trực thuộc tổ Hoàn Thành Sản Phẩm.', null),
(@DeptHoanThanh,@section1,5, N'Material Handler', N'Công đoạn Vận chuyển nội bộ, trực thuộc tổ Hoàn Thành Sản Phẩm.', null),
(@DeptHoanThanh,@section2,5, N'Issuance & Storage', N'Công đoạn Bảo quản và Cấp phát Nhãn, trực thuộc tổ Hậu cần.', null),
(@DeptHoanThanh,@section2,5, N'Folding & Packing', N'Công đoạn Gấp xếp và Đóng thùng thành phẩm, trực thuộc tổ Hậu cần.', null),
(@DeptHoanThanh,@section2,5, N'Loading & Unloading', N'Công đoạn Bốc Xếp, trực thuộc tổ Hậu cần.', null),
(@DeptHoanThanh,@section3,5, N'KCS', N'Công đoạn Quản lý chất lượng khâu Thành phẩm, trực thuộc tổ KCS SW.', null),
(@DeptHoanThanh,@section4,5, N'Production Data Clerk', N'Công đoạn Thống kê Thành phẩm trước khi xuát hàng, trực thuộc Bộ phận Xuất hàng.', null)
GO
----seed dataa usser
INSERT INTO tbUser 
(full_name, email, password_hash, phone, gender, role_id)
VALUES
-- Admin
('Admin', 'admin@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000000', 1,
 (SELECT role_id FROM tbRole WHERE name = 'Admin')),
 -- HR
 ('HR', 'hr@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0910000000', 1,
 (SELECT role_id FROM tbRole WHERE name = 'HR'))
GO


INSERT INTO tbUser 
(full_name, email, password_hash, phone, gender, role_id, department_id, line_id, salary_type, base_salary, skill_level_id, hire_date)
VALUES
-- Factory Director (Female)
('Factory Director', 'factory.director@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000001', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Factory Director'), 
 NULL, NULL, 'TimeBased', 45000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 7'), '2000-07-01'),
-- Factory Manager (Female)
('Factory Manager', 'factory.manager@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000002', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Factory Manager'), (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
NULL, 'TimeBased', 35000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 6'), '2000-12-01'),

-- Manager Operations (Female)
('Manager Operations', 'manager.operations@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000003', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Manager'), (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
(SELECT line_id FROM tbLine WHERE name = 'Operations/ Vận hành'),
'TimeBased', 25000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 4'), '2002-02-01'),

-- Manager Delivery (Female)
('Manager Delivery', 'manager.delivery@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000004', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Manager'), (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
(SELECT line_id FROM tbLine WHERE name = 'Delivery/ Giao hàng'),
'TimeBased', 25000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 4'), '2004-02-11'),

-- Leader Finishing (Female)
('Leader Finishing', 'leader.finishing@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000005', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Leader'), (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
(SELECT line_id FROM tbLine WHERE name = 'Finishing/ Tổ Hoàn Thành'),
'ProductBased', 13000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 3'), '2004-02-11'),

-- Assistant Leader Finishing (Female)
('Assistant Leader Finishing', 'assistant.finishing@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000006', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Assistant Leader'), (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
(SELECT line_id FROM tbLine WHERE name = 'Finishing/ Tổ Hoàn Thành'),
'ProductBased', 11000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 3'), '2005-02-11'),

-- Leader Warehouse (Female)
('Leader Warehouse', 'leader.warehouse@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000007', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Leader'), (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
(SELECT line_id FROM tbLine WHERE name = 'Warehouse/ Tổ Hậu Cần'),
'TimeBased', 12000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 3'), '2006-02-11'),

-- Assistant Leader Warehouse (Male)
('Assistant Leader Warehouse', 'assistant.warehouse@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000008', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Assistant Leader'), (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
(SELECT line_id FROM tbLine WHERE name = 'Warehouse/ Tổ Hậu Cần'),
'TimeBased', 11000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 3'), '2007-02-11'),

-- Leader KCS SW (Female)
('Leader KCS SW', 'leader.kcssw@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000009', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Leader'), (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
(SELECT line_id FROM tbLine WHERE name = 'KCS SW/ Tổ KCS'),
'TimeBased', 14000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 4'), '2006-02-11'),

-- Leader Planning Local (Female)
('Leader Planning Local', 'leader.planning@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','0900000010', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Leader'), (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
(SELECT line_id FROM tbLine WHERE name = 'Planing Local/ Kế Hoạch'),
'TimeBased', 13000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 4'), '2016-02-11')
GO


--workers Finishing/ Tổ Hoàn Thành/ Sewing Programming
DECLARE @i INT = 1;
WHILE @i <= 10
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender,role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0100')),
        0,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Sewing Programming'),
        'ProductBased', 8000000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 2'),
        '2010-9-01'
    );
    SET @i = @i + 1;
END;
GO
--workers Finishing/ Tổ Hoàn Thành/ Passant
DECLARE @i INT = 11;
WHILE @i <= 15
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender,role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0100')),
        0,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Passant'),
        'ProductBased', 6000000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 1'),
        '2010-9-01'
    );
    SET @i = @i + 1;
END;
GO
--workers Finishing/ Tổ Hoàn Thành/ Rivet
DECLARE @i INT = 16;
WHILE @i <= 18
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender,role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0100')),
        0,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Rivet'),
        'ProductBased', 6500000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 1'),
        '2010-9-01'
    );
    SET @i = @i + 1;
END;
GO

--workers Finishing/ Tổ Hoàn Thành/ Label Attaching
DECLARE @i INT = 19;
WHILE @i <= 21
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender,role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0100')),
        0,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Label Attaching'),
        'ProductBased', 6500000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 1'),
        '2010-9-01'
    );
    SET @i = @i + 1;
END;
GO

--workers Finishing/ Tổ Hoàn Thành/ Dust Cleaning 
DECLARE @i INT = 22;
WHILE @i <= 24
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender,role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0100')),
        0,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Dust Cleaning'),
        'ProductBased', 6000000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 1'),
        '2010-9-01'
    );
    SET @i = @i + 1;
END;
GO

--workers Finishing/ Tổ Hoàn Thành/ Ironing 
DECLARE @i INT = 25;
WHILE @i <= 27
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender,role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0100')),
        1,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Ironing'),
        'ProductBased', 7500000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 2'),
        '2010-10-01'
    );
    SET @i = @i + 1;
END;
GO

--workers Finishing/ Tổ Hoàn Thành/ Material Handler 
DECLARE @i INT = 28;
WHILE @i <= 31
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender,role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0100')),
        0,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Material Handler'),
        'ProductBased', 6500000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 1'),
        '2010-10-01'
    );
    SET @i = @i + 1;
END;
GO

--workers Warehouse/ Tổ Hậu Cần/ Issuance & Storage
DECLARE @i INT = 32;
WHILE @i <= 33
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender, role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0200')),
        0,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Issuance & Storage'),
        'TimeBased', 7500000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 2'),
        '2011-5-15'
    );
    SET @i = @i + 1;
END;
GO

--workers Warehouse/ Tổ Hậu Cần/ Folding & Packing
DECLARE @i INT = 34;
WHILE @i <= 38
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender, role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0200')),
        1,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Folding & Packing'),
        'TimeBased', 5500000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 1'),
        '2011-5-15'
    );
    SET @i = @i + 1;
END;
GO

--workers Warehouse/ Tổ Hậu Cần/ Loading & Unloading
DECLARE @i INT = 39;
WHILE @i <= 43
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender, role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0200')),
        1,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Folding & Packing'),
        'TimeBased', 6000000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 1'),
        '2011-5-15'
    );
    SET @i = @i + 1;
END;
GO

-- wworkers KCS SW/ Tổ KCS/ KCS
DECLARE @i INT = 44;
WHILE @i <= 46
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender, role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0200')),
        0,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'KCS'),
        'TimeBased', 9000000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 3'),
        '2012-3-20'
    );
    SET @i = @i + 1;
END;
GO

--wworkers Planing Local/ Kế Hoạch/Production Data Clerk
DECLARE @i INT = 47;
WHILE @i <= 48
BEGIN
    INSERT INTO tbUser (
        full_name, email, password_hash, phone, gender, role_id, department_id,
        line_id, salary_type, base_salary, skill_level_id, hire_date
    )
    VALUES (
        CONCAT('Worker ', FORMAT(@i, '00')),
        CONCAT('worker', FORMAT(@i, '00'), '@maypro.com'),
        '$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq',
        CONCAT('090000', FORMAT(@i, '0200')),
        0,
        (SELECT role_id FROM tbRole WHERE name = 'Worker'),
        (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
        (SELECT line_id FROM tbLine WHERE name = 'Production Data Clerk'),
        'TimeBased', 8500000, (SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 2'),
        '2013-7-25'
    );
    SET @i = @i + 1;
END;
GO

-- =============================================
-- 7. tbWorkSchedule - Lịch làm việc
-- =============================================
CREATE TABLE tbWorkSchedule (
    schedule_id INT IDENTITY(1000,1) PRIMARY KEY,
    user_id INT NOT NULL,
    [date] DATE NOT NULL,
    shift_start TIME,
    shift_end TIME,
    is_holiday BIT DEFAULT 0,
    CONSTRAINT FK_WorkSchedule_User FOREIGN KEY (user_id) REFERENCES tbUser(user_id)
);
GO

-- =============================================
-- 8. tbAttendance - Chấm công
-- =============================================
CREATE TABLE tbAttendance (
    attendance_id INT IDENTITY(1000,1) PRIMARY KEY, 
    user_id INT NOT NULL,
    [date] DATE NOT NULL,
    time_in TIME,
    time_out TIME,
    [status] VARCHAR(20) NOT NULL 
        CHECK (status IN ('success', 'late', 'manual', 'error')),
    reason TEXT,
    manual_updated_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Attendance_User FOREIGN KEY (user_id) REFERENCES tbUser(user_id),
    CONSTRAINT FK_Attendance_UpdatedBy FOREIGN KEY (manual_updated_by) REFERENCES tbUser(user_id),
    INDEX idx_user_date NONCLUSTERED (user_id, date)
);
GO

-- =============================================
-- 9. tbLeaveRequest - Đơn xin nghỉ
-- =============================================
CREATE TABLE tbLeaveRequest (
    request_id INT IDENTITY(1000,1) PRIMARY KEY,
    user_id INT NOT NULL,
    leave_reason_id INT NOT NULL,
    [type] VARCHAR(20) NOT NULL 
        CHECK (type IN ('ShortTerm', 'LongTerm', 'Maternity', 'Accident', 'Other')),
    [start_date] DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    [comment] TEXT,
    [status] VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'approved', 'rejected')),
    confirmed_by INT,
    approved_by INT,
    reject_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_LeaveRequest_User FOREIGN KEY (user_id) REFERENCES tbUser(user_id),
    CONSTRAINT FK_LeaveRequest_Reason FOREIGN KEY (leave_reason_id) REFERENCES tbLeaveReason(leave_reason_id),
    CONSTRAINT FK_LeaveRequest_ConfirmedBy FOREIGN KEY (confirmed_by) REFERENCES tbUser(user_id),
    CONSTRAINT FK_LeaveRequest_ApprovedBy FOREIGN KEY (approved_by) REFERENCES tbUser(user_id),
    INDEX idx_user_status NONCLUSTERED (user_id, status)
);
GO
-- =============================================
-- 10. tbProposal - Đề xuất
-- =============================================
CREATE TABLE tbProposal (
    proposal_id INT IDENTITY(1000,1) PRIMARY KEY,   
    [type] VARCHAR(30) NOT NULL 
        CHECK (type IN ('SalaryIncrease', 'PositionChange', 'SkillLevelChange')),
    proposer_id INT NOT NULL,
    target_user_id INT NOT NULL,
    details NVARCHAR(MAX),
    reason TEXT,
    [status] VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'approved', 'rejected')),
    approved_by INT,
    reject_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Proposal_Proposer FOREIGN KEY (proposer_id) REFERENCES tbUser(user_id),
    CONSTRAINT FK_Proposal_Target FOREIGN KEY (target_user_id) REFERENCES tbUser(user_id),
    CONSTRAINT FK_Proposal_ApprovedBy FOREIGN KEY (approved_by) REFERENCES tbUser(user_id),
    INDEX idx_target_status NONCLUSTERED (target_user_id, status)
);
GO
-- =============================================
-- 11. tbOvertimeRequest - Yêu cầu tăng ca
-- =============================================
CREATE TABLE tbOvertimeRequest (
    request_id INT IDENTITY(1000,1) PRIMARY KEY,
    factory_manager_id INT NOT NULL,
    department_id INT NOT NULL,
    overtime_date DATE NOT NULL,
    start_time TIME NOT NULL DEFAULT '17:00:00',
    end_time TIME NOT NULL,
    overtime_time FLOAT NOT NULL,
    [status] VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'open', 'processed', 'rejected', 'expired')),
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_OvertimeRequest_Manager FOREIGN KEY (factory_manager_id) REFERENCES tbUser(user_id),
    CONSTRAINT FK_OvertimeRequest_Department FOREIGN KEY (department_id) REFERENCES tbDepartment(department_id)
);
GO

-- =============================================
-- 12 tbOvertimeRequestDetail - Chi tiết số lượng theo chuyền
-- =============================================
CREATE TABLE tbOvertimeRequestDetail (
    detail_id INT IDENTITY(1000,1) PRIMARY KEY,
    request_id INT NOT NULL,
    line_id INT NOT NULL,
    num_employees INT NOT NULL CHECK (num_employees > 0), 
    
    CONSTRAINT FK_RequestDetail_Request FOREIGN KEY (request_id) 
        REFERENCES tbOvertimeRequest(request_id) ON DELETE CASCADE,
    CONSTRAINT FK_RequestDetail_Line FOREIGN KEY (line_id) 
        REFERENCES tbLine(line_id),
    
    CONSTRAINT UQ_RequestDetail_Line UNIQUE (request_id, line_id) 
);
GO

-- =============================================
-- 13. tbOvertimeTicket - Phiếu tăng ca
-- =============================================
CREATE TABLE tbOvertimeTicket (
    ticket_id INT IDENTITY(1000,1) PRIMARY KEY,
    manager_id INT NOT NULL,
    request_id INT,
    reason TEXT,
    [status] VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'submitted', 'confirmed', 'approved', 'rejected')),
    confirmed_by INT,
    approved_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_OvertimeTicket_Manager FOREIGN KEY (manager_id) REFERENCES tbUser(user_id),
    CONSTRAINT FK_OvertimeTicket_Request FOREIGN KEY (request_id) REFERENCES tbOvertimeRequest(request_id),
    CONSTRAINT FK_OvertimeTicket_ConfirmedBy FOREIGN KEY (confirmed_by) REFERENCES tbUser(user_id),
    CONSTRAINT FK_OvertimeTicket_ApprovedBy FOREIGN KEY (approved_by) REFERENCES tbUser(user_id)
);
GO

-- =============================================
-- 14. tb_overtime_ticket_employees - Chi tiết nhân viên tăng ca
-- =============================================
CREATE TABLE tb_overtime_ticket_employees (
    id INT IDENTITY(1000,1) PRIMARY KEY,
    overtime_ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    line_id INT NULL,
    
    -- [UPDATED STATUS] 'accepted' is better than 'ok'
    [status] VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')), 
    
    -- Prevent duplicate invites for the same ticket
    CONSTRAINT UQ_Ticket_User UNIQUE (overtime_ticket_id, user_id), 
    
    CONSTRAINT FK_OvertimeEmployees_Ticket FOREIGN KEY (overtime_ticket_id) 
        REFERENCES tbOvertimeTicket(ticket_id) ON DELETE CASCADE,
    CONSTRAINT FK_OvertimeEmployees_User FOREIGN KEY (user_id) 
        REFERENCES tbUser(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_OvertimeEmployees_Line FOREIGN KEY (line_id) 
        REFERENCES tbLine(line_id)
);
GO

-- =============================================
-- 15. tbProduction - Sản lượng (theo bộ phận)
-- =============================================
CREATE TABLE tbProduction (
    production_id INT IDENTITY(1000,1) PRIMARY KEY, 
    department_id INT NOT NULL,
    product_count INT NOT NULL,
    DOP DATE NOT NULL,
    unit_price DECIMAL(15,1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_Production_Department 
        FOREIGN KEY (department_id) REFERENCES tbDepartment(department_id),

    INDEX idx_dept_date NONCLUSTERED (department_id, DOP)
);
GO
-- =============================================
-- 16. tbPayroll - Bảng lương
-- =============================================
CREATE TABLE tbPayroll (
    payroll_id INT IDENTITY(1000,1) PRIMARY KEY,
    [month] DATE NOT NULL,
    department_id INT NOT NULL,
    total_salary DECIMAL(12,2) NOT NULL,
    details NVARCHAR(MAX),
    [status] VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'balanced', 'approved', 'rejected')),
    created_by INT NOT NULL,
    approved_by INT,
    balance_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Payroll_Department FOREIGN KEY (department_id) REFERENCES tbDepartment(department_id),
    CONSTRAINT FK_Payroll_CreatedBy FOREIGN KEY (created_by) REFERENCES tbUser(user_id),
    CONSTRAINT FK_Payroll_ApprovedBy FOREIGN KEY (approved_by) REFERENCES tbUser(user_id),
    INDEX idx_month_status NONCLUSTERED (month, status)
);
GO

-- =============================================
-- 17. tbReservedPayroll - Quỹ dự phòng
-- =============================================
CREATE TABLE tbReservedPayroll (
    reserved_id INT IDENTITY(1000,1) PRIMARY KEY,
    payroll_id INT NOT NULL,
    reserved_amount DECIMAL(12,2) NOT NULL,
    details NVARCHAR(MAX),
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_ReservedPayroll_Payroll FOREIGN KEY (payroll_id) REFERENCES tbPayroll(payroll_id),
    CONSTRAINT FK_ReservedPayroll_CreatedBy FOREIGN KEY (created_by) REFERENCES tbUser(user_id)
);
GO

-- =============================================
-- 18. tbUserHistory - Lịch sử thay đổi
-- =============================================
CREATE TABLE tbUserHistory (
    history_id INT IDENTITY(1000,1) PRIMARY KEY,
    user_id INT NOT NULL,
    field_changed VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    updated_by INT NOT NULL,
    [timestamp] DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_UserHistory_User FOREIGN KEY (user_id) REFERENCES tbUser(user_id),
    CONSTRAINT FK_UserHistory_UpdatedBy FOREIGN KEY (updated_by) REFERENCES tbUser(user_id)
);
GO
-- =============================================
-- 19. tbNotification - Thông báo
-- =============================================
CREATE TABLE tbNotification (
    notification_id INT IDENTITY(1000,1) PRIMARY KEY, 
    recipient_id INT NOT NULL,
    [type] VARCHAR(20) NOT NULL 
        CHECK (type IN ('error', 'approval', 'rejection', 'other')),
    [message] TEXT NOT NULL,
    sent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    [status] VARCHAR(10) DEFAULT 'sent' 
        CHECK (status IN ('sent', 'read')),
    CONSTRAINT FK_Notification_Recipient FOREIGN KEY (recipient_id) REFERENCES tbUser(user_id)
);
GO
-- =============================================
-- 20. Chi tiết lương từng nhân viên theo tháng
-- =============================================
CREATE TABLE tbEmployeePayroll (
    detail_id INT IDENTITY(199180000,1) PRIMARY KEY,
    payroll_id INT NOT NULL,
    user_id INT NOT NULL,
    base_salary DECIMAL(15,2) NOT NULL,
    product_bonus DECIMAL(15,2) DEFAULT 0,
    overtime_pay DECIMAL(15,2) DEFAULT 0,
    allowance DECIMAL(15,2) DEFAULT 0,
    deduction DECIMAL(15,2) DEFAULT 0,
    total_pay DECIMAL(15,2) NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_EmployeePayroll_Payroll 
        FOREIGN KEY (payroll_id) REFERENCES tbPayroll(payroll_id),
    CONSTRAINT FK_EmployeePayroll_User 
        FOREIGN KEY (user_id) REFERENCES tbUser(user_id),

    INDEX idx_user_payroll NONCLUSTERED (user_id, payroll_id)
);
GO

-- =============================================
-- 21. tbPasswordResetToken - Mã đặt lại mật khẩu
-- =============================================
CREATE TABLE tbPasswordResetToken (
    token_id INT IDENTITY(1,1) PRIMARY KEY,
    token VARCHAR(500) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    verification_type VARCHAR(20),
    contact_value VARCHAR(255),
    otp VARCHAR(10),
    [expiry_date] DATETIME NOT NULL,
    used BIT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT FK_PasswordResetToken_User 
        FOREIGN KEY (user_id) REFERENCES tbUser(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_token ON tbPasswordResetToken(token);
CREATE INDEX idx_user_used ON tbPasswordResetToken(user_id, used);
GO

-- =============================================
-- 22. tb_face_training
-- =============================================
CREATE TABLE [dbo].[tb_face_training] (
    [confidence]         NUMERIC (5, 4)     NULL,
    [face_id]            INT                IDENTITY (1, 1) NOT NULL,
    [is_trained]         BIT                DEFAULT ((0)) NULL,
    [trained_by_user_id] INT                NULL,
    [user_id]            INT                NOT NULL,
    [created_at]         DATETIMEOFFSET (6) DEFAULT (getdate()) NULL,
    [training_date]      DATETIMEOFFSET (6) NULL,
    [updated_at]         DATETIMEOFFSET (6) DEFAULT (getdate()) NULL,
    [model_version]      VARCHAR (50)       NULL,
    [face_image_path]    VARCHAR (500)      NULL,
    [face_embedding]     VARBINARY (MAX)    NULL,
    [notes]              NVARCHAR (MAX)     NULL,
    PRIMARY KEY CLUSTERED ([face_id] ASC),
    CONSTRAINT [FK3upin7y3jjed4ynf5uh6r4tna] FOREIGN KEY ([user_id]) REFERENCES [dbo].[tbUser] ([user_id]) ON DELETE CASCADE,
    CONSTRAINT [FKhql4hs07406pqtb6t2wp31j2o] FOREIGN KEY ([trained_by_user_id]) REFERENCES [dbo].[tbUser] ([user_id])
);

-- =============================================
-- 23. tb_face_scan_log
-- =============================================
CREATE TABLE [dbo].[tb_face_scan_log] (
    [attendance_id]      INT                NULL,
    [is_matched]         BIT                DEFAULT ((0)) NULL,
    [is_recognized]      BIT                DEFAULT ((0)) NULL,
    [matched_confidence] NUMERIC (5, 4)     NULL,
    [matched_face_id]    INT                NULL,
    [user_id]            INT                NULL,
    [created_at]         DATETIMEOFFSET (6) NULL,
    [id]                 BIGINT             IDENTITY (1, 1) NOT NULL,
    [scan_date]          DATETIMEOFFSET (6) DEFAULT (getdate()) NULL,
    [scan_type]          VARCHAR (20)       NULL,
    [scan_image_path]    VARCHAR (500)      NULL,
    PRIMARY KEY CLUSTERED ([id] ASC),
    CHECK ([scan_type]='CHECK_OUT' OR [scan_type]='CHECK_IN'),
    CONSTRAINT [FK165tcaoyq7vnyfdit10rtx892] FOREIGN KEY ([matched_face_id]) REFERENCES [dbo].[tb_face_training] ([face_id]),
    CONSTRAINT [FKio6b8istfatnwcoyv3k9pdcv1] FOREIGN KEY ([user_id]) REFERENCES [dbo].[tbUser] ([user_id])
);
GO

-- =============================================
-- INSERT SAMPLE DATA
-- =============================================

-- 7. tbWorkSchedule - 3 samples
INSERT INTO tbWorkSchedule (user_id, [date], shift_start, shift_end, is_holiday)
VALUES
    (1001, '2025-11-26', '07:30:00', '16:30:00', 0),
    (1002, '2025-11-26', '07:30:00', '16:30:00', 0),
    (1003, '2025-11-27', '07:30:00', '16:30:00', 0);
GO

-- 8. tbAttendance - 3 samples
INSERT INTO tbAttendance (user_id, [date], time_in, time_out, [status], reason, manual_updated_by)
VALUES
    (1011, '2025-11-26', '07:28:00', '16:32:00', 'success', NULL, NULL),
    (1012, '2025-11-26', '07:45:00', '16:30:00', 'late', N'Kẹt xe', NULL),
    (1013, '2025-11-26', '08:00:00', '16:30:00', 'manual', N'Quên chấm công', 1001);
GO

-- 9. tbLeaveRequest - 3 samples
INSERT INTO tbLeaveRequest (user_id, leave_reason_id, [type], start_date, end_date, reason, [comment], [status], confirmed_by, approved_by)
VALUES
    (1014, 1000, 'ShortTerm', '2025-11-28', '2025-11-29', N'Ốm sốt', N'Có giấy bác sĩ', 'approved', 1004, 1001),
    (1015, 1003, 'Other', '2025-12-01', '2025-12-01', N'Đám cưới em', NULL, 'confirmed', 1004, NULL),
    (1016, 1005, 'Other', '2025-12-05', '2025-12-07', N'Nghỉ phép năm', NULL, 'pending', NULL, NULL);
GO

-- 10. tbProposal - 3 samples
INSERT INTO tbProposal ([type], proposer_id, target_user_id, details, reason, [status], approved_by)
VALUES
    ('SalaryIncrease', 1004, 1011, N'Tăng lương từ 8,000,000 lên 8,500,000', N'Hoàn thành tốt công việc 6 tháng', 'approved', 1001),
    ('SkillLevelChange', 1004, 1012, N'Nâng từ Level 1 lên Level 2', N'Đã qua đào tạo và kiểm tra', 'confirmed', NULL),
    ('PositionChange', 1002, 1020, N'Chuyển từ Worker sang Assistant Leader', N'Có năng lực lãnh đạo tốt', 'pending', NULL);
GO

-- 11. tbOvertimeRequest - 3 samples
DECLARE @DeptFinishing INT = (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành');
INSERT INTO tbOvertimeRequest (factory_manager_id, department_id, overtime_date, start_time, end_time, overtime_time, [status], details)
VALUES
    (1001, @DeptFinishing, '2025-11-30', '17:00:00', '20:00:00', 3.0, 'open', N'Tăng ca hoàn thành đơn hàng gấp'),
    (1001, @DeptFinishing, '2025-12-01', '17:00:00', '19:30:00', 2.5, 'pending', N'Tăng ca kiểm tra chất lượng'),
    (1001, @DeptFinishing, '2025-11-28', '17:00:00', '20:30:00', 3.5, 'processed', N'Đã hoàn thành tăng ca');
GO

-- 12. tbOvertimeRequestDetail - 3 samples
INSERT INTO tbOvertimeRequestDetail (request_id, line_id, num_employees)
VALUES
    (1000, 1006, 10),
    (1000, 1007, 5),
    (1001, 1006, 8);
GO

-- 13. tbOvertimeTicket - 3 samples
INSERT INTO tbOvertimeTicket (manager_id, request_id, reason, [status], confirmed_by, approved_by)
VALUES
    (1002, 1000, N'Tăng ca hoàn thành đơn hàng', 'approved', 1002, 1001),
    (1002, 1001, N'Tăng ca kiểm tra chất lượng', 'confirmed', 1002, NULL),
    (1003, 1000, N'Tăng ca đóng gói sản phẩm', 'submitted', NULL, NULL);
GO

-- 14. tb_overtime_ticket_employees - 3 samples
INSERT INTO tb_overtime_ticket_employees (overtime_ticket_id, user_id, line_id, [status])
VALUES
    (1000, 1011, 1006, 'accepted'),
    (1000, 1012, 1006, 'accepted'),
    (1001, 1013, 1007, 'pending');
GO

-- 15. tbProduction - 3 samples
DECLARE @DeptFinishing2 INT = (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành');
INSERT INTO tbProduction (department_id, product_count, DOP, unit_price)
VALUES
    (@DeptFinishing2, 1200, '2025-11-25', 150.5),
    (@DeptFinishing2, 1350, '2025-11-26', 152.0),
    (@DeptFinishing2, 1180, '2025-11-27', 151.2);
GO

-- 16. tbPayroll - 3 samples
DECLARE @DeptFinishing3 INT = (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành');
INSERT INTO tbPayroll ([month], department_id, total_salary, details, [status], created_by, approved_by)
VALUES
    ('2025-10-01', @DeptFinishing3, 850000000.00, N'Bảng lương tháng 10', 'approved', 1001, 1000),
    ('2025-11-01', @DeptFinishing3, 870000000.00, N'Bảng lương tháng 11', 'balanced', 1001, NULL),
    ('2025-09-01', @DeptFinishing3, 840000000.00, N'Bảng lương tháng 9', 'approved', 1001, 1000);
GO

-- 17. tbReservedPayroll - 3 samples
INSERT INTO tbReservedPayroll (payroll_id, reserved_amount, details, created_by)
VALUES
    (1000, 50000000.00, N'Dự phòng thưởng cuối năm', 1001),
    (1001, 45000000.00, N'Dự phòng tăng lương', 1001),
    (1002, 40000000.00, N'Dự phòng phúc lợi', 1001);
GO

-- 18. tbUserHistory - 3 samples
INSERT INTO tbUserHistory (user_id, field_changed, old_value, new_value, updated_by)
VALUES
    (1011, 'base_salary', '8000000', '8500000', 1001),
    (1012, 'skill_level_id', '1000', '1001', 1004),
    (1013, 'line_id', '1006', '1007', 1002);
GO

-- 19. tbNotification - 3 samples
INSERT INTO tbNotification (recipient_id, [type], [message], [status])
VALUES
    (1011, 'approval', N'Đơn xin tăng lương của bạn đã được duyệt', 'read'),
    (1012, 'approval', N'Đơn xin nghỉ phép của bạn đã được duyệt', 'sent'),
    (1013, 'other', N'Lịch tăng ca ngày 30/11/2025 đã được tạo', 'sent');
GO

-- 20. tbEmployeePayroll - 3 samples
INSERT INTO tbEmployeePayroll (payroll_id, user_id, base_salary, product_bonus, overtime_pay, allowance, deduction, total_pay, note)
VALUES
    (1000, 1011, 8000000.00, 1200000.00, 500000.00, 200000.00, 0.00, 9900000.00, N'Lương tháng 10 - Đầy đủ'),
    (1000, 1012, 6000000.00, 900000.00, 300000.00, 200000.00, 0.00, 7400000.00, N'Lương tháng 10 - Đầy đủ'),
    (1000, 1013, 6000000.00, 0.00, 0.00, 200000.00, 100000.00, 6100000.00, N'Lương tháng 10 - Nghỉ không phép 1 ngày');
GO

-- 21. tbPasswordResetToken - 3 samples
INSERT INTO tbPasswordResetToken (token, user_id, expiry_date, used)
VALUES
    ('abc123def456ghi789jkl012mno345pqr678stu901', 1011, DATEADD(HOUR, 24, GETDATE()), 0),
    ('xyz789uvw456rst123opq890nml567kji234hgf012', 1012, DATEADD(HOUR, -1, GETDATE()), 1),
    ('qwe098rty765uio432asd109zxc876bnm543vfr210', 1013, DATEADD(HOUR, 12, GETDATE()), 0);
GO

-- 22. tb_face_training - 3 samples
INSERT INTO tb_face_training (user_id, is_trained, trained_by_user_id, confidence, training_date, model_version, face_image_path, notes)
VALUES
    (1011, 1, 1001, 0.9523, GETDATE(), 'v1.0', '/faces/user1011_face.jpg', N'Đào tạo nhận diện khuôn mặt lần 1'),
    (1012, 1, 1001, 0.9687, GETDATE(), 'v1.0', '/faces/user1012_face.jpg', N'Đào tạo nhận diện khuôn mặt lần 1'),
    (1013, 0, NULL, NULL, NULL, NULL, '/faces/user1013_face.jpg', N'Chưa hoàn thành đào tạo');
GO

-- 23. tb_face_scan_log - 3 samples
INSERT INTO tb_face_scan_log (user_id, matched_face_id, is_recognized, is_matched, matched_confidence, scan_type, scan_date, scan_image_path)
VALUES
    (1011, 1, 1, 1, 0.9523, 'CHECK_IN', GETDATE(), '/scans/scan_1011_in.jpg'),
    (1011, 1, 1, 1, 0.9501, 'CHECK_OUT', DATEADD(HOUR, 8, GETDATE()), '/scans/scan_1011_out.jpg'),
    (1012, 2, 1, 1, 0.9687, 'CHECK_IN', GETDATE(), '/scans/scan_1012_in.jpg');
GO

SELECT * FROM tbRole --1
SELECT * FROM tbLeaveReason --2
SELECT * FROM tbSkillLevel--3
SELECT * FROM tbDepartment--4
SELECT * FROM tbUser --5
SELECT * FROM tbLine --6
SELECT * FROM tbWorkSchedule --7
SELECT * FROM tbAttendance --8
SELECT * FROM tbLeaveRequest --9
SELECT * FROM tbProposal --10
SELECT * FROM tbOvertimeRequest --11
SELECT * FROM tbOvertimeRequestDetail --12
SELECT * FROM tbOvertimeTicket --13
SELECT * FROM tb_overtime_ticket_employees--14
SELECT * FROM tbProduction --15
SELECT * FROM tbPayroll --16
SELECT * FROM tbReservedPayroll--17
SELECT * FROM tbUserHistory--18
SELECT * FROM tbNotification--19
SELECT * FROM tbEmployeePayroll--20
SELECT * FROM tbPasswordResetToken--21
SELECT * FROM tb_face_training--22
SELECT * FROM tb_face_scan_log--23






INSERT INTO tbUser 
(full_name, email, password_hash, phone, gender, role_id, department_id, line_id, salary_type, base_salary, skill_level_id, hire_date)
VALUES
('Manager Operations 2', 'manager2.operations@maypro.com','$2a$10$jcw0c1yYkDzTO4XTg/kTmeD3UggCAaQwpw1v1R76VMupvQMwelxwq','09000000033', 0,
 (SELECT role_id FROM tbRole WHERE name = 'Manager'), (SELECT department_id FROM tbDepartment WHERE name = 'Finishing Center/Trung tâm hoàn thành'),
(SELECT line_id FROM tbLine WHERE name = 'Operations/ Vận hành'),
'TimeBased', 25000000,(SELECT skill_level_id FROM tbSkillLevel WHERE name = 'Level 4'), '2002-02-01')
GO