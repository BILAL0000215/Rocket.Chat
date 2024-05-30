import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';

import { getCredentials, api, request, credentials } from '../../data/api-data.js';
import { createRoom, deleteRoom } from '../../data/rooms.helper';
import { adminUsername } from '../../data/user';
import { createUser, deleteUser, login } from '../../data/users.helper.js';

describe('[Subscriptions]', function () {
	this.retries(0);

	before((done) => getCredentials(done));

	let testChannel;

	before(async () => {
		testChannel = (await createRoom({ type: 'c', name: `channel.test.${Date.now()}` })).body.channel;
	});

	after(() => deleteRoom({ type: 'c', roomId: testChannel._id }));

	it('/subscriptions.get', (done) => {
		request
			.get(api('subscriptions.get'))
			.set(credentials)
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('update');
				expect(res.body).to.have.property('remove');
			})
			.end(done);
	});

	it('/subscriptions.get?updatedSince', (done) => {
		request
			.get(api('subscriptions.get'))
			.set(credentials)
			.query({
				updatedSince: new Date(),
			})
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('update').that.have.lengthOf(0);
				expect(res.body).to.have.property('remove').that.have.lengthOf(0);
			})
			.end(done);
	});

	it('/subscriptions.getOne:', () => {
		it('subscriptions.getOne', (done) => {
			request
				.get(api('subscriptions.getOne'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('subscription').and.to.be.an('object');
				})
				.end(done);
		});
	});

	describe('[/subscriptions.read]', () => {
		let testChannel;
		let testGroup;
		let testDM;
		let user;

		before(async () => {
			user = await createUser();
			testChannel = (await createRoom({ type: 'c', name: `channel.test.${Date.now()}` })).body.channel;
			testGroup = (await createRoom({ type: 'p', name: `group.test.${Date.now()}` })).body.group;
			testDM = (await createRoom({ type: 'd', username: user.username })).body.room;
		});

		after(() =>
			Promise.all([
				deleteRoom({ type: 'd', roomId: testDM._id }),
				deleteRoom({ type: 'c', roomId: testChannel._id }),
				deleteRoom({ type: 'p', roomId: testGroup._id }),
				deleteUser(user),
			]),
		);

		it('should mark public channels as read', (done) => {
			request
				.post(api('subscriptions.read'))
				.set(credentials)
				.send({
					rid: testChannel._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should mark groups as read', (done) => {
			request
				.post(api('subscriptions.read'))
				.set(credentials)
				.send({
					rid: testGroup._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should mark DMs as read', (done) => {
			request
				.post(api('subscriptions.read'))
				.set(credentials)
				.send({
					rid: testDM._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should fail on two params with different ids', (done) => {
			request
				.post(api('subscriptions.read'))
				.set(credentials)
				.send({
					rid: testDM._id,
					roomId: testChannel._id,
				})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'invalid-params');
				})
				.end(done);
		});

		it('should fail on mark inexistent public channel as read', (done) => {
			request
				.post(api('subscriptions.read'))
				.set(credentials)
				.send({
					rid: 'foobar123-somechannel',
				})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('error', 'error-invalid-subscription');
				})
				.end(done);
		});

		it('should fail on mark inexistent group as read', (done) => {
			request
				.post(api('subscriptions.read'))
				.set(credentials)
				.send({
					rid: 'foobar123-somegroup',
				})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('error', 'error-invalid-subscription');
				})
				.end(done);
		});

		it('should fail on mark inexistent DM as read', (done) => {
			request
				.post(api('subscriptions.read'))
				.set(credentials)
				.send({
					rid: 'foobar123-somedm',
				})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('error', 'error-invalid-subscription');
				})
				.end(done);
		});

		it('should fail on invalid params', (done) => {
			request
				.post(api('subscriptions.read'))
				.set(credentials)
				.send({
					rid: 12345,
				})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('error', 'error-invalid-subscription');
				})
				.end(done);
		});

		it('should fail on empty params', (done) => {
			request
				.post(api('subscriptions.read'))
				.set(credentials)
				.send({})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'invalid-params');
				})
				.end(done);
		});

		describe('should handle threads correctly', () => {
			let threadId;
			let user;
			let threadUserCredentials;

			before(async () => {
				user = await createUser({ username: 'testthread123', password: 'testthread123' });
				threadUserCredentials = await login('testthread123', 'testthread123');

				const res = await request
					.post(api('chat.sendMessage'))
					.set(threadUserCredentials)
					.send({
						message: {
							rid: testChannel._id,
							msg: 'Starting a Thread',
						},
					});

				threadId = res.body.message._id;
			});

			after(async () => {
				await deleteUser(user);
			});

			it('should mark threads as read', async () => {
				await request
					.post(api('chat.sendMessage'))
					.set(threadUserCredentials)
					.send({
						message: {
							rid: testChannel._id,
							msg: `@${adminUsername} making admin follow this thread`,
							tmid: threadId,
						},
					});
				await request
					.post(api('subscriptions.read'))
					.set(credentials)
					.send({
						rid: testChannel._id,
						readThreads: true,
					})
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.property('success', true);
					});

				await request
					.get(api('subscriptions.getOne'))
					.set(credentials)
					.query({
						roomId: testChannel._id,
					})
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.property('success', true);
						expect(res.body.subscription).to.not.have.property('tunread');
					});
			});

			it('should not mark threads as read', async () => {
				await request
					.post(api('chat.sendMessage'))
					.set(threadUserCredentials)
					.send({
						message: {
							rid: testChannel._id,
							msg: `@${adminUsername} making admin follow this thread`,
							tmid: threadId,
						},
					});
				await request
					.post(api('subscriptions.read'))
					.set(credentials)
					.send({
						rid: testChannel._id,
						readThreads: false,
					})
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.property('success', true);
					});

				await request
					.get(api('subscriptions.getOne'))
					.set(credentials)
					.query({
						roomId: testChannel._id,
					})
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.property('success', true);
						expect(res.body.subscription).to.have.property('tunread');
						expect(res.body.subscription.tunread).to.be.an('array');
						expect(res.body.subscription.tunread).to.deep.equal([threadId]);
					});
			});
		});
	});

	describe('[/subscriptions.unread]', () => {
		let testChannel;

		before(async () => {
			testChannel = (await createRoom({ type: 'c', name: `channel.test.${Date.now()}` })).body.channel;
		});

		after(() => deleteRoom({ type: 'c', roomId: testChannel._id }));

		it('should fail when there are no messages on an channel', (done) => {
			request
				.post(api('subscriptions.unread'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
				})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('error');
					expect(res.body).to.have.property('errorType', 'error-no-message-for-unread');
				})
				.end(done);
		});
		it('sending message', (done) => {
			request
				.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						rid: testChannel._id,
						msg: 'Sample message',
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('message').and.to.be.an('object');
				})
				.end(done);
		});
		it('should return success: true when make as unread successfully', (done) => {
			request
				.post(api('subscriptions.unread'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should fail on invalid params', (done) => {
			request
				.post(api('subscriptions.unread'))
				.set(credentials)
				.send({
					roomId: 12345,
				})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('error');
				})
				.end(done);
		});

		it('should fail on empty params', (done) => {
			request
				.post(api('subscriptions.unread'))
				.set(credentials)
				.send({})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('error');
				})
				.end(done);
		});
	});
});
