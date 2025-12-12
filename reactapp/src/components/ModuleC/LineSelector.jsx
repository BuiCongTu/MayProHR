import { useEffect, useState } from 'react';
import { axiosInstance } from "../../services/api";
export default function LineSelector({ departmentId, onLineSelected }) {
    const [hierarchy, setHierarchy] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedLines, setExpandedLines] = useState(new Set());

    // Fetch hierarchy when departmentId changes
    useEffect(() => {
        if (departmentId) {
            fetchLineHierarchy(departmentId);
        }
    }, [departmentId]);

    const fetchLineHierarchy = async (deptId) => {
        try {
            setLoading(true);
            setError('');
            const response = await axiosInstance.get('/lines/hierarchy', {
                params: { departmentId: deptId }
            });

           
            let hierarchyData = null;
            
            if (response.data.success && response.data.data) {
                hierarchyData = response.data.data;
            } else if (response.data.data && !('success' in response.data)) {
                hierarchyData = response.data.data;
            } else if (!('data' in response.data) && !('success' in response.data)) {
                hierarchyData = response.data;
            }

            if (hierarchyData) {
                setHierarchy(hierarchyData);
            } else {
                setError(response.data.message || 'Failed to load line hierarchy');
            }
        } catch (err) {
            console.error('Error loading line hierarchy:', err);
            setError('Unable to load line hierarchy');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (lineId) => {
        const newExpanded = new Set(expandedLines);
        if (newExpanded.has(lineId)) {
            newExpanded.delete(lineId);
        } else {
            newExpanded.add(lineId);
        }
        setExpandedLines(newExpanded);
    };

    const renderLineNode = (node, depth = 0, path = []) => {
        const isExpanded = expandedLines.has(node.id);
        const hasChildren = node.children && node.children.length > 0;

        const currentPath = [...path, node];

        return (
            <div key={node.id} style={{ marginLeft: `${depth * 20}px` }} className="line-node">
                <div className="line-item d-flex align-items-center gap-2 mb-2">
                    {hasChildren && (
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            style={{ minWidth: '30px' }}
                            onClick={() => toggleExpand(node.id)}
                        >
                            {isExpanded ? '|' : '-'}
                        </button>
                    )}
                    {!hasChildren && <span style={{ minWidth: '30px' }}></span>}

                    <button
                        className="btn btn-sm btn-outline-primary flex-grow-1 text-start"
                        onClick={() => onLineSelected && onLineSelected(node, currentPath)}
                    >
                        <strong>{node.name}</strong>
                        <br />
                        <small className="text-muted">
                            Level {node.level} | {node.totalEmployees} employees |
                            Manager: {node.managerName}
                        </small>
                    </button>
                </div>

                {hasChildren && isExpanded && (
                    <div className="children-container">
                        {node.children.map(child => renderLineNode(child, depth + 1, currentPath))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="text-center p-3">Loading line hierarchy...</div>;
    if (error) return <div className="alert alert-danger">{error}</div>;
    if (!hierarchy) return <div className="alert alert-info">No data</div>;

    return (
        <div className="line-selector p-3 border rounded">
            <h5>Department: {hierarchy.departmentName}</h5>
            <hr />
            {hierarchy.rootLines && hierarchy.rootLines.length > 0 ? (
                <div className="lines-tree">
                    {hierarchy.rootLines.map(rootLine => renderLineNode(rootLine, 0, []))}
                </div>
            ) : (
                <div className="alert alert-info">No lines available</div>
            )}
        </div>
    );
}
