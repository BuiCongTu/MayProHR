// ProposalConfirm.js
import React from 'react';
import { getCurrentUser } from '../../../services/authService';
import ProposalList from './ProposalList';
import ErrorPage from '../../ErrorPage';

function ProposalConfirm() {
    const user = getCurrentUser();

    const isFactoryManager =
        user?.roleName === 'Factory Manager' ||
        user?.roleName === 'FManager';

    if (!isFactoryManager) {
        return (
            <ErrorPage
                code={403}
                title="Access Forbidden"
                message="Only Factory Managers can confirm position change proposals."
            />
        );
    }

    return (
        <ProposalList
            title="My Position Change Proposals"
            proposalType="position-change"
            filterByProposerId={user.id}
            defaultStatus="" // hiển thị tất cả
        />
    );
}

export default ProposalConfirm;
