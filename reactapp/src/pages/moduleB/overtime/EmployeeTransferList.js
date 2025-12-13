import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemIcon, ListItemText, Checkbox,
    Paper, Typography, TextField, InputAdornment,
    Stack, ToggleButton, ToggleButtonGroup, Divider,
    Avatar, Tooltip, ListItemAvatar, ListSubheader
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import LockIcon from '@mui/icons-material/Lock';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';

// --- HELPER FUNCTIONS ---
function intersection(a, b) {
    return a.filter((value) => b.indexOf(value) !== -1);
}

function not(a, b) {
    return a.filter((value) => b.indexOf(value) === -1);
}

function stringAvatar(name) {
    const nameParts = name ? name.split(' ') : ['?'];
    let initials = nameParts[0][0];
    if (nameParts.length > 1) {
        initials += nameParts[nameParts.length - 1][0];
    }
    return {
        sx: {
            bgcolor: stringToColor(name || ''),
            width: 32,
            height: 32,
            fontSize: '0.8rem',
            mr: 1
        },
        children: initials,
    };
}

function stringToColor(string) {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
}

export default function EmployeeTransferList({
                                                 open,
                                                 onClose,
                                                 title,
                                                 allEmployees = [],
                                                 initialSelected = [],
                                                 unavailableEmployees = new Map(),
                                                 requestedCount = 0, // THIS IS NOW THE HARD GAP LIMIT
                                                 targetLineId = null,
                                                 onSave
                                             }) {
    const [checked, setChecked] = useState([]);
    const [right, setRight] = useState([]);
    const [viewFilter, setViewFilter] = useState('available');
    const [searchTerm, setSearchTerm] = useState("");

    // Calculate 'Left' list (Source) excluding already selected 'Right' users
    const left = useMemo(() => {
        const rightIds = new Set(right.map(u => u.id));
        return allEmployees.filter(u => !rightIds.has(u.id));
    }, [allEmployees, right]);

    useEffect(() => {
        if (open) {
            setRight(initialSelected);
            setChecked([]);
            setViewFilter('available');
            setSearchTerm("");
        }
    }, [open, initialSelected]);

    // --- STRICT LIMIT LOGIC ---
    const targetCount = requestedCount || 0;
    const selectedCount = right.length;
    const remainingSlots = Math.max(0, targetCount - selectedCount);
    const isFull = selectedCount >= targetCount;

    // Determine Status Bar Color
    let statusColor = 'info';
    let statusIcon = <AssignmentIndIcon fontSize="small" sx={{ mr: 1 }} />;
    let statusText = `Filling Gap: ${selectedCount} / ${targetCount}`;

    if (targetCount > 0) {
        if (selectedCount === targetCount) {
            statusColor = 'success';
            statusIcon = <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />;
            statusText = `Gap Filled: ${selectedCount} / ${targetCount}`;
        } else if (selectedCount > targetCount) {
            // Should not happen with buttons disabled, but as a safeguard
            statusColor = 'error';
            statusIcon = <BlockIcon fontSize="small" sx={{ mr: 1 }} />;
            statusText = `Over Limit: ${selectedCount} / ${targetCount}`;
        }
    } else {
        // Gap is 0 (Line Full)
        statusColor = 'success';
        statusIcon = <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />;
        statusText = "Line is Full (0 Slots)";
    }

    // --- FILTERING LOGIC ---
    const filterList = (list, isSourceList) => {
        return list.filter(u => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = (
                (u.fullName || '').toLowerCase().includes(term) ||
                (u.id || '').toString().includes(term) ||
                (u.email || '').toLowerCase().includes(term)
            );

            if (!matchesSearch) return false;

            if (isSourceList && viewFilter === 'available') {
                return !unavailableEmployees.has(u.id);
            }

            return true;
        });
    };

    const leftFiltered = filterList(left, true);
    const rightFiltered = filterList(right, false);

    // --- GROUPING LOGIC ---
    const { priorityList, otherList } = useMemo(() => {
        const priority = [];
        const others = [];
        leftFiltered.forEach(emp => {
            if (targetLineId && (emp.lineId === targetLineId)) {
                priority.push(emp);
            } else {
                others.push(emp);
            }
        });
        return { priorityList: priority, otherList: others };
    }, [leftFiltered, targetLineId]);

    const leftChecked = intersection(checked, leftFiltered);
    const rightChecked = intersection(checked, rightFiltered);

    // --- HANDLERS ---

    const handleToggle = (value) => () => {
        if (unavailableEmployees.has(value.id) && left.includes(value)) return;

        const currentIndex = checked.indexOf(value);
        const newChecked = [...checked];
        if (currentIndex === -1) newChecked.push(value);
        else newChecked.splice(currentIndex, 1);
        setChecked(newChecked);
    };

    const handleCheckedRight = () => {
        // STRICT CHECK: Ensure we don't exceed the gap
        if (leftChecked.length > remainingSlots) return;

        setRight(right.concat(leftChecked));
        setChecked(not(checked, leftChecked));
    };

    const handleCheckedLeft = () => {
        setRight(not(right, rightChecked));
        setChecked(not(checked, rightChecked));
    };

    const handleAllRight = () => {
        let candidates = leftFiltered.filter(u => !unavailableEmployees.has(u.id));

        if (targetLineId) {
            candidates.sort((a, b) => {
                const aIsLine = a.lineId === targetLineId;
                const bIsLine = b.lineId === targetLineId;
                if (aIsLine && !bIsLine) return -1;
                if (!aIsLine && bIsLine) return 1;
                return 0;
            });
        }

        // STRICT CHECK: Only take what fits in the remaining slots
        const itemsToMove = candidates.slice(0, remainingSlots);

        if (itemsToMove.length > 0) {
            setRight(right.concat(itemsToMove));
        }
    };

    const handleAllLeft = () => {
        setRight(not(right, rightFiltered));
    };

    // -- ROW RENDERER --
    const renderRow = (user, type) => {
        const isUnavailable = unavailableEmployees.has(user.id);
        const reason = unavailableEmployees.get(user.id);
        const labelId = `transfer-list-item-${user.id}-label`;
        const isChecked = checked.indexOf(user) !== -1;

        return (
            <ListItem
                key={user.id}
                role="listitem"
                button
                onClick={handleToggle(user)}
                disabled={isUnavailable && type === 'source'}
                divider
                sx={{
                    bgcolor: isChecked ? 'action.selected' : 'inherit',
                    py: 0.5,
                    opacity: (isUnavailable && type === 'source') ? 0.6 : 1
                }}
            >
                <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                        checked={isChecked}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 'aria-labelledby': labelId }}
                        disabled={isUnavailable && type === 'source'}
                        size="small"
                    />
                </ListItemIcon>
                <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar {...stringAvatar(user.fullName)} />
                </ListItemAvatar>
                <ListItemText
                    id={labelId}
                    primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: isUnavailable ? 'normal' : 'medium',
                                    color: isUnavailable ? 'text.disabled' : 'text.primary'
                                }}
                            >
                                {user.fullName}
                            </Typography>
                            {isUnavailable && type === 'source' && (
                                <Tooltip title={reason} placement="top" arrow>
                                    <Stack direction="row" alignItems="center" sx={{ cursor: 'help' }}>
                                        <LockIcon sx={{ fontSize: 14, color: 'error.main', mr: 0.5 }} />
                                        <Typography variant="caption" color="error" sx={{ fontSize: '0.65rem' }}>
                                            Blocked
                                        </Typography>
                                    </Stack>
                                </Tooltip>
                            )}
                        </Stack>
                    }
                    secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            ID: {user.id} • {user.lineName || 'Unassigned'}
                        </Typography>
                    }
                />
            </ListItem>
        );
    };

    // -- LIST CONTAINER --
    const CustomList = ({ type }) => (
        <Paper
            elevation={0}
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderColor: 'divider',
                overflow: 'hidden'
            }}
        >
            <Box sx={{
                py: 1,
                px: 2,
                bgcolor: 'grey.100',
                borderBottom: 1,
                borderColor: 'divider',
                flexShrink: 0
            }}>
                <Typography variant="subtitle2" fontWeight="bold" align="center" color="text.primary">
                    {type === 'source' ? 'Available Candidates' : 'Selected Employees'}
                </Typography>
            </Box>

            <Divider />

            <List
                dense
                component="div"
                role="list"
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    bgcolor: 'background.paper',
                    position: 'relative',
                    p: 0
                }}
            >
                {type === 'source' && leftFiltered.length === 0 && (
                    <Box p={3} textAlign="center" color="text.secondary">
                        <GroupAddIcon fontSize="large" color="disabled" />
                        <Typography variant="caption" display="block">No employees found</Typography>
                    </Box>
                )}

                {type === 'target' && rightFiltered.length === 0 && (
                    <Box p={3} textAlign="center" color="text.secondary">
                        <PlaylistAddCheckIcon fontSize="large" color="disabled" />
                        <Typography variant="caption" display="block">List is empty</Typography>
                    </Box>
                )}

                {type === 'source' && priorityList.length > 0 && (
                    <ListSubheader sx={{ bgcolor: '#e3f2fd', lineHeight: '30px', fontWeight: 'bold', color: 'primary.main' }}>
                        ★ Recommended (Current Line)
                    </ListSubheader>
                )}
                {type === 'source' && priorityList.map(user => renderRow(user, type))}

                {type === 'source' && otherList.length > 0 && priorityList.length > 0 && (
                    <ListSubheader sx={{ bgcolor: '#f5f5f5', lineHeight: '30px', fontWeight: 'bold', borderTop: '1px solid #e0e0e0' }}>
                        ↓ Other Departments
                    </ListSubheader>
                )}
                {type === 'source' && otherList.map(user => renderRow(user, type))}

                {type === 'target' && rightFiltered.map(user => renderRow(user, type))}
            </List>
        </Paper>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                sx: {
                    width: '100%',
                    maxWidth: 950,
                    height: '85vh',
                    maxHeight: 800,
                    display: 'flex',
                    flexDirection: 'column'
                }
            }}
        >
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', px: 3, py: 2, flexShrink: 0 }}>
                <Typography variant="h6" fontWeight="bold">{title}</Typography>
            </DialogTitle>

            <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f8f9fa' }}>

                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        p: 1.5,
                        mb: 2,
                        bgcolor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        flexShrink: 0,
                        flexWrap: 'wrap'
                    }}
                >
                    <TextField
                        size="small"
                        placeholder="Find employee..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        sx={{ flex: 1, minWidth: 180, maxWidth: 280 }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
                    />

                    <ToggleButtonGroup
                        value={viewFilter}
                        exclusive
                        onChange={(e, v) => v && setViewFilter(v)}
                        size="small"
                    >
                        <ToggleButton value="available">Available</ToggleButton>
                        <ToggleButton value="all">All</ToggleButton>
                    </ToggleButtonGroup>

                    <Box sx={{ flexGrow: 1 }} />

                    {/* STATUS BAR */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                        py: 0.75,
                        borderRadius: 1,
                        bgcolor: `${statusColor}.50`,
                        border: 1,
                        borderColor: `${statusColor}.light`,
                        color: `${statusColor}.main`
                    }}>
                        {statusIcon}
                        <Typography variant="body2" fontWeight="bold">
                            {statusText}
                        </Typography>
                    </Box>
                </Paper>

                <Stack
                    direction="row"
                    spacing={2}
                    sx={{ flex: 1, minHeight: 0 }}
                >
                    <Box sx={{ width: '45%', height: '100%' }}>{CustomList({ type: 'source' })}</Box>

                    <Box sx={{ width: '10%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                        {/* Auto-fill all remaining slots */}
                        <Button
                            variant="outlined"
                            onClick={handleAllRight}
                            disabled={isFull || leftFiltered.filter(u => !unavailableEmployees.has(u.id)).length === 0}
                            sx={{ minWidth: 40 }}
                        >
                            <KeyboardDoubleArrowRightIcon />
                        </Button>

                        {/* Move Selected - Block if selected > remaining */}
                        <Button
                            variant="contained"
                            onClick={handleCheckedRight}
                            disabled={isFull || leftChecked.length === 0 || leftChecked.length > remainingSlots}
                            sx={{ minWidth: 40 }}
                        >
                            <KeyboardArrowRightIcon />
                        </Button>

                        <Button
                            variant="contained"
                            onClick={handleCheckedLeft}
                            disabled={rightChecked.length === 0}
                            sx={{ minWidth: 40 }}
                        >
                            <KeyboardArrowLeftIcon />
                        </Button>

                        <Button
                            variant="outlined"
                            onClick={handleAllLeft}
                            disabled={rightFiltered.length === 0}
                            sx={{ minWidth: 40 }}
                        >
                            <KeyboardDoubleArrowLeftIcon />
                        </Button>
                    </Box>

                    <Box sx={{ width: '45%', height: '100%' }}>{CustomList({ type: 'target' })}</Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2, bgcolor: 'white', flexShrink: 0 }}>
                <Button onClick={onClose} color="inherit" sx={{ mr: 1 }}>Cancel</Button>
                <Button
                    onClick={() => onSave(right)}
                    variant="contained"
                    size="large"
                    // Disabled if no change OR empty list (optional enforcement)
                    disabled={right.length === 0 && initialSelected.length === 0}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
}