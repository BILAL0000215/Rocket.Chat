import type { ILivechatInquiryRecord } from '@rocket.chat/core-typings';
import { LivechatInquiryStatus } from '@rocket.chat/core-typings';
import type { FindOptions, FindCursor, UpdateResult, DeleteResult } from 'mongodb';

import { Base } from './_Base';

export class LivechatInquiry extends Base {
	constructor() {
		super('livechat_inquiry');

		this.tryEnsureIndex({ rid: 1 }); // room id corresponding to this inquiry
		this.tryEnsureIndex({ name: 1 }); // name of the inquiry (client name for now)
		this.tryEnsureIndex({ message: 1 }); // message sent by the client
		this.tryEnsureIndex({ ts: 1 }); // timestamp
		this.tryEnsureIndex({ department: 1 });
		this.tryEnsureIndex({ status: 1 }); // 'ready', 'queued', 'taken'
		this.tryEnsureIndex({ priorityId: 1, priorityWeight: 1 }, { sparse: true });
		this.tryEnsureIndex(
			{ priorityWeight: 1, estimatedWaitingTimeQueue: 1, estimatedServiceTimeAt: 1, ts: 1 },
			{ partialFilterExpression: { status: { $eq: LivechatInquiryStatus.QUEUED } } },
		); // used for sorting inquiries when OmnichannelSortingMechanismSettingType.Priority is selected
		this.tryEnsureIndex(
			{ estimatedWaitingTimeQueue: 1, estimatedServiceTimeAt: 1, priorityWeight: 1, ts: 1 },
			{ partialFilterExpression: { status: { $eq: LivechatInquiryStatus.QUEUED } } },
		); // used for sorting inquiries when OmnichannelSortingMechanismSettingType.SLAs is selected
		this.tryEnsureIndex({ 'v.token': 1, 'status': 1 }); // visitor token and status
		this.tryEnsureIndex({ locked: 1, lockedAt: 1 }, { sparse: true }); // locked and lockedAt
	}

	findOneById(inquiryId: string): ILivechatInquiryRecord {
		return this.findOne({ _id: inquiryId });
	}

	findOneByRoomId(rid: string, options?: FindOptions<ILivechatInquiryRecord>): ILivechatInquiryRecord {
		return this.findOne({ rid }, options);
	}

	getQueuedInquiries(options?: FindOptions<ILivechatInquiryRecord>): FindCursor<ILivechatInquiryRecord> {
		return this.find({ status: 'queued' }, options);
	}

	/*
	 * mark the inquiry as taken
	 */
	takeInquiry(inquiryId: string): void {
		this.update(
			{
				_id: inquiryId,
			},
			{
				$set: { status: 'taken', takenAt: new Date() },
				$unset: { defaultAgent: 1, estimatedInactivityCloseTimeAt: 1 },
			},
		);
	}

	/*
	 * mark inquiry as open
	 */
	openInquiry(inquiryId: string): UpdateResult {
		return this.update(
			{
				_id: inquiryId,
			},
			{
				$set: { status: 'open' },
			},
		);
	}

	/*
	 * mark inquiry as queued
	 */
	queueInquiry(inquiryId: string): UpdateResult {
		return this.update(
			{
				_id: inquiryId,
			},
			{
				$set: { status: 'queued', queuedAt: new Date() },
				$unset: { takenAt: 1 },
			},
		);
	}

	queueInquiryAndRemoveDefaultAgent(inquiryId: string): UpdateResult {
		return this.update(
			{
				_id: inquiryId,
			},
			{
				$set: { status: 'queued', queuedAt: new Date() },
				$unset: { takenAt: 1, defaultAgent: 1 },
			},
		);
	}

	/*
	 * mark inquiry as ready
	 */
	readyInquiry(inquiryId: string): UpdateResult {
		return this.update(
			{
				_id: inquiryId,
			},
			{
				$set: {
					status: 'ready',
				},
			},
		);
	}

	changeDepartmentIdByRoomId(rid: string, department: string): void {
		const query = {
			rid,
		};
		const updateObj = {
			$set: {
				department,
			},
		};

		this.update(query, updateObj);
	}

	/*
	 * return the status of the inquiry (open or taken)
	 */
	getStatus(inquiryId: string): ILivechatInquiryRecord['status'] {
		return this.findOne({ _id: inquiryId }).status;
	}

	updateVisitorStatus(token: string, status: string): UpdateResult {
		const query = {
			'v.token': token,
			'status': 'queued',
		};

		const update = {
			$set: {
				'v.status': status,
			},
		};

		return this.update(query, update);
	}

	setDefaultAgentById(inquiryId: string, defaultAgent: ILivechatInquiryRecord['defaultAgent']): UpdateResult {
		return this.update(
			{
				_id: inquiryId,
			},
			{
				$set: {
					defaultAgent,
				},
			},
		);
	}

	setNameByRoomId(rid: string, name: string): UpdateResult {
		const query = { rid };

		const update = {
			$set: {
				name,
			},
		};
		return this.update(query, update);
	}

	findOneByToken(token: string): ILivechatInquiryRecord {
		const query = {
			'v.token': token,
			'status': 'queued',
		};
		return this.findOne(query);
	}

	removeDefaultAgentById(inquiryId: string): UpdateResult {
		return this.update(
			{
				_id: inquiryId,
			},
			{
				$unset: { defaultAgent: 1 },
			},
		);
	}

	/*
	 * remove the inquiry by roomId
	 */
	removeByRoomId(rid: string): DeleteResult {
		return this.remove({ rid });
	}

	removeByVisitorToken(token: string): void {
		const query = {
			'v.token': token,
		};

		this.remove(query);
	}
}

export default new LivechatInquiry();
