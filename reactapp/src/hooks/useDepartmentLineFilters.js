import { useEffect, useState } from 'react';
import { axiosInstance } from '../services/api';

export default function useDepartmentLineFilters()
{
    const [departments, setDepartments] = useState([]);
    const [departmentsLoading, setDepartmentsLoading] = useState(true);
    const [departmentsError, setDepartmentsError] = useState('');

    const [filters, setFilters] = useState({
        departmentId: null,
        departmentName: '',
        lineId: null,
        lineName: '',
        linePath: [] // mảng node từ root -> leaf
    });

    // Hiển thị LineSelector cho department hiện tại
    const [showLineSelector, setShowLineSelector] = useState(false);
    const [selectedDeptForLines, setSelectedDeptForLines] = useState(null);

    // 1. Load danh sách department
    useEffect(() =>
    {
        const fetchDepartments = async () =>
        {
            try
            {
                setDepartmentsLoading(true);
                setDepartmentsError('');

                const response = await axiosInstance.get('/department');
                let list = [];

                if (Array.isArray(response.data))
                {
                    list = response.data;
                } else if (response.data?.data && Array.isArray(response.data.data))
                {
                    list = response.data.data;
                } else if (response.data?.content && Array.isArray(response.data.content))
                {
                    list = response.data.content;
                }

                setDepartments(list);

                // Chọn mặc định departmentId = 1005 nếu tồn tại và chưa có filter
                if (!filters.departmentId && Array.isArray(list) && list.length > 0)
                {
                    const defaultDept = list.find((d) => d.id === 1005);
                    if (defaultDept)
                    {
                        setFilters({
                            departmentId: defaultDept.id,
                            departmentName: defaultDept.name,
                            lineId: null,
                            lineName: '',
                            linePath: []
                        });
                        setSelectedDeptForLines(defaultDept.id);
                    }
                }
            } catch (err)
            {
                const msg =
                    err?.response?.data?.message ||
                    err.message ||
                    'Unable to load departments';
                setDepartmentsError(msg);
                setDepartments([]);
            } finally
            {
                setDepartmentsLoading(false);
            }
        };

        fetchDepartments();
    }, []);

    // 2. Chọn department (dùng trong <select> onChange)
    const handleDepartmentChange = (e) =>
    {
        const rawValue = e?.target ? e.target.value : e;
        const selectedId = rawValue ? parseInt(rawValue, 10) : NaN;

        if (!selectedId || Number.isNaN(selectedId))
        {
            // Clear department + line filters
            setFilters({
                departmentId: null,
                departmentName: '',
                lineId: null,
                lineName: '',
                linePath: []
            });
            setSelectedDeptForLines(null);
            setShowLineSelector(false);
            return;
        }

        const dept = departments.find((d) => d.id === selectedId);
        setFilters((prev) => ({
            ...prev,
            departmentId: selectedId,
            departmentName: dept?.name || '',
            lineId: null,
            lineName: '',
            linePath: []
        }));

        // Đưa departmentId cho LineSelector dùng (LineSelector sẽ tự fetch hierarchy)
        setSelectedDeptForLines(selectedId);
        setShowLineSelector(true);
    };

    // 3. Gọi khi chọn line/subline/workunit trong LineSelector (node: {id, name, ...})
    const handleLineSelected = (lineNode, path = []) =>
    {
        if (!lineNode)
        {
            // clear line filter
            setFilters((prev) => ({
                ...prev,
                lineId: null,
                lineName: '',
                linePath: []
            }));
            setShowLineSelector(false);
            return;
        }

        setFilters((prev) => ({
            ...prev,
            lineId: lineNode.id,
            lineName: lineNode.name,
            linePath: Array.isArray(path) ? path : []
        }));
        setShowLineSelector(false);
    };

    // 4. Clear toàn bộ filter Department + Line
    const clearDepartmentLineFilters = () =>
    {
        setFilters({
            departmentId: null,
            departmentName: '',
            lineId: null,
            lineName: '',
            linePath: []
        });
        setShowLineSelector(false);
        setSelectedDeptForLines(null);
    };

    return {
        // departments
        departments,
        departmentsLoading,
        departmentsError,

        // filter departmentId, departmentName, lineId, lineName
        filters,

        // dùng cho LineSelector (component bên ngoài import và render)
        showLineSelector,
        setShowLineSelector,
        selectedDeptForLines,

        // handler
        handleDepartmentChange,
        handleLineSelected,
        clearDepartmentLineFilters
    };
}