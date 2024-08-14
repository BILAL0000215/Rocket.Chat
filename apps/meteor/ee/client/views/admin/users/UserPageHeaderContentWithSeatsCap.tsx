import { Button, ButtonGroup, Margins } from '@rocket.chat/fuselage';
import { useSetModal, useTranslation, useRouter, useSetting } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React from 'react';

import { useExternalLink } from '../../../../../client/hooks/useExternalLink';
import { useShouldPreventAction } from '../../../../../client/hooks/useShouldPreventAction';
import { useCheckoutUrl } from '../../../../../client/views/admin/subscription/hooks/useCheckoutUrl';
import AssignExtensionModal from '../../../../../client/views/admin/users/voip/AssignExtensionModal';
import SeatsCapUsage from './SeatsCapUsage';

type UserPageHeaderContentWithSeatsCapProps = {
	activeUsers: number;
	maxActiveUsers: number;
};

const UserPageHeaderContentWithSeatsCap = ({ activeUsers, maxActiveUsers }: UserPageHeaderContentWithSeatsCapProps): ReactElement => {
	const isCreateUserDisabled = useShouldPreventAction('activeUsers');

	const t = useTranslation();
	const router = useRouter();
	const setModal = useSetModal();

	const canRegisterExtension = useSetting('VoIP_TeamCollab_Enabled');

	const manageSubscriptionUrl = useCheckoutUrl()({ target: 'user-page', action: 'buy_more' });
	const openExternalLink = useExternalLink();

	const handleNewButtonClick = () => {
		router.navigate('/admin/users/new');
	};

	const handleInviteButtonClick = () => {
		router.navigate('/admin/users/invite');
	};

	return (
		<>
			<Margins inline={16}>
				<SeatsCapUsage members={activeUsers} limit={maxActiveUsers} />
			</Margins>
			<ButtonGroup>
				{canRegisterExtension && (
					<Button primary onClick={(): void => setModal(<AssignExtensionModal closeModal={(): void => setModal(null)} />)}>
						{t('Associate_Extension')}
					</Button>
				)}
				<Button icon='mail' onClick={handleInviteButtonClick}>
					{t('Invite')}
				</Button>
				<Button icon='user-plus' onClick={handleNewButtonClick}>
					{t('New_user')}
				</Button>
				{isCreateUserDisabled && (
					<Button primary role='link' onClick={() => openExternalLink(manageSubscriptionUrl)}>
						{t('Buy_more_seats')}
					</Button>
				)}
			</ButtonGroup>
		</>
	);
};

export default UserPageHeaderContentWithSeatsCap;
