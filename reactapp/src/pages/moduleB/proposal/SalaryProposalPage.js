// SalaryProposalPage.js
import React from 'react';
import { getCurrentUser } from '../../../services/authService';
import ProposalList from './ProposalList';
import ErrorPage from '../../ErrorPage';
import SalaryProposalForm from './SalaryProposalForm';

function SalaryProposalPage() {
    const user = getCurrentUser();
    const isFactoryManager = user?.roleName === 'Factory Manager' || user?.roleName === 'FManager';

    if (!isFactoryManager) {
        return <ErrorPage code={403} title="Access Forbidden" message="Only Factory Managers can submit salary proposals." />;
    }

    return (
        <>
            <SalaryProposalForm proposerId={user.id} />
            <ProposalList
                title="Salary Proposals"
                mode="view"
                filterByProposerId={user.id}
                defaultStatus=""
                proposalType="SalaryIncrease"
            />
        </>
    );
}

export default SalaryProposalPage;
