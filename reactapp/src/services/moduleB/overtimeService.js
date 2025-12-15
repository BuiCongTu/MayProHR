import api from '../api'; // Import the configured instance (default export)

// Note: baseURL is already '/api' in the instance, so we just need the relative path
const OVERTIME_REQUEST_API = '/overtime-request/';
const OVERTIME_TICKET_API = '/overtime-ticket/';

// --- Overtime Request Services ---

export async function getFilteredOvertimeRequest(filter, pageable) {
    const params = {
        ...filter,
        page: pageable.page,
        size: pageable.size,
        sort: pageable.sort,
    };

    try {
        // Use 'api' instead of 'axios' + manual URL
        const response = await api.get(OVERTIME_REQUEST_API, { params });
        console.log("Overtime request response:", response.data);
        return response.data;
    } catch (err) {
        console.error("Failed to fetch overtime requests:", err);
        return { content: [], totalElements: 0 };
    }
}

export async function createOvertimeRequest(requestData) {
    const API_URL = OVERTIME_REQUEST_API + 'create';
    try {
        const response = await api.post(API_URL, requestData);
        return response.data;
    } catch (err) {
        console.error("Failed to create overtime request:", err);
        throw err.response?.data || new Error('Failed to create request');
    }
}

export async function approveOvertimeRequest(requestId) {
    const API_URL = `${OVERTIME_REQUEST_API}${requestId}/approve`;
    try {
        const response = await api.post(API_URL);
        return response.data;
    } catch (err) {
        console.error("Failed to approve overtime request:", err);
        throw err.response?.data || new Error('Failed to approve request');
    }
}

export async function rejectOvertimeRequest(requestId, reason) {
    const API_URL = `${OVERTIME_REQUEST_API}${requestId}/reject`;
    try {
        const response = await api.post(API_URL + '?reason=' + reason);
        return response.data;
    } catch (err) {
        console.error("Failed to reject overtime request:", err);
        throw err.response?.data || new Error('Failed to reject request');
    }
}

export async function processOvertimeRequest(requestId) {
    const API_URL = `${OVERTIME_REQUEST_API}${requestId}/process`;
    try {
        const response = await api.post(API_URL);
        return response.data;
    } catch (err) {
        console.error("Failed to process overtime request:", err);
        throw err.response?.data || new Error('Failed to process request');
    }
}

export async function getOvertimeRequestById(id) {
    const API_URL = `${OVERTIME_REQUEST_API}${id}`;
    try {
        const response = await api.get(API_URL);
        return response.data;
    } catch (err) {
        console.error(`Failed to fetch request ${id}:`, err);
        throw err;
    }
}

// --- Overtime Ticket Services ---

export async function getFilteredOvertimeTickets(filter, pageable) {
    const params = {
        ...filter,
        page: pageable.page,
        size: pageable.size,
        sort: pageable.sort,
    };

    try {
        const response = await api.get(OVERTIME_TICKET_API, { params });
        console.log("Overtime ticket response:", response.data);
        return response.data;
    } catch (err) {
        console.error("Failed to fetch overtime tickets:", err);
        return { content: [], totalElements: 0 };
    }
}

export async function submitOvertimeTicket(ticketId) {
    const API_URL = `${OVERTIME_TICKET_API}${ticketId}/submit`;
    try {
        const response = await api.post(API_URL);
        return response.data;
    } catch (err) {
        console.error("Failed to submit overtime ticket:", err);
        throw err.response?.data || new Error('Failed to submit ticket');
    }
}

export async function confirmOvertimeTicket(ticketId) {
    const API_URL = `${OVERTIME_TICKET_API}${ticketId}/confirm`;
    try {
        const response = await api.post(API_URL);
        return response.data;
    } catch (err) {
        console.error("Failed to confirm overtime ticket:", err);
        throw err.response?.data || new Error('Failed to confirm ticket');
    }
}

export async function rejectOvertimeTicket(ticketId, reason) {
    const API_URL = `${OVERTIME_TICKET_API}${ticketId}/reject`;
    try {
        const response = await api.post(API_URL + '?reason=' + reason);
        return response.data;
    } catch (err) {
        console.error("Failed to reject overtime ticket:", err);
        throw err.response?.data || new Error('Failed to reject ticket');
    }
}

export async function approveOvertimeTicket(ticketId, reason) {
    const safeReason = reason || "Approved by Factory Manager";
    const API_URL = `${OVERTIME_TICKET_API}${ticketId}/approve`;
    try {
        const response = await api.post(API_URL + '?reason=' + safeReason);
        return response.data;
    } catch (err) {
        console.error("Failed to approve overtime ticket:", err);
        throw err.response?.data || new Error('Failed to approve ticket');
    }
}

export async function getOvertimeTicketById(id) {
    const API_URL = `${OVERTIME_TICKET_API}${id}`;
    try {
        const response = await api.get(API_URL);
        return response.data;
    } catch (err) {
        console.error(`Failed to fetch ticket ${id}:`, err);
        throw err;
    }
}

export async function createOvertimeTicket(ticketData) {
    const API_URL = `${OVERTIME_TICKET_API}create`;
    try {
        const response = await api.post(API_URL, ticketData);
        return response.data;
    } catch (err) {
        console.error("Failed to create ticket:", err);
        throw err.response?.data || new Error('Failed to create ticket');
    }
}

export async function checkEmployeeAvailability(requestId, employeeIds) {
    const API_URL = `${OVERTIME_TICKET_API}check-availability`;
    try {
        const response = await api.post(API_URL, {
            requestId: requestId,
            employeeIds: employeeIds
        });
        return response.data;
    } catch (err) {
        console.error("Failed to check availability:", err);
        throw err.response?.data || new Error('Failed to check availability');
    }
}