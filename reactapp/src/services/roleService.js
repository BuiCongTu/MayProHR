import api from './api';

// Get all roles
export const getAllRoles = async () =>
{
    try
    {
        // const response = await api.get('/admin/roles');
        // return response.data || [];
        const response = await api.get('/form-data/roles');
        return response.data?.data || [];
    } catch (error)
    {
        console.error('Failed to fetch roles:', error);
        throw error;
    }
};


// Get role by ID
export const getRoleById = async (roleId) =>
{
    try
    {
        const response = await api.get(`/admin/roles/${roleId}`);
        return response.data;
    } catch (error)
    {
        console.error('Failed to fetch role by ID:', error);
        throw error;
    }
};

// Search roles by name
export const searchRoles = async (searchTerm) =>
{
    try
    {
        const response = await api.get('/admin/roles', {
            params: { search: searchTerm }
        });
        return response.data || [];
    } catch (error)
    {
        console.error('Failed to search roles:', error);
        throw error;
    }
};
