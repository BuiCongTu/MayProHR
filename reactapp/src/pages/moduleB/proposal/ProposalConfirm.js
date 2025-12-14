// factory managre
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
            title="Confirm Position Change Proposals"
            mode="view"
            filterByProposerId={user.id}
            defaultStatus=""
        />
    );
}

export default ProposalConfirm;