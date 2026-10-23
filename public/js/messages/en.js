/* Turnly messages: English (the default language).
 *
 * One flat object of key -> ICU message. Variables are {name}; plurals are
 * {n, plural, one{...} other{# ...}} where # is the formatted number. Never
 * build a sentence by concatenating two messages: add a key that holds the
 * whole sentence instead. tests/messages.test.js keeps this file and id.js
 * in step (same keys, same placeholders). No em dashes in any message.
 *
 * Glossary (fixed terms, use them everywhere): arisan stays "arisan";
 * iuran = contribution; giliran = turn; periode = round; penerima =
 * recipient; dana diserahkan = payout handed over; admin = organizer in
 * prose, "Admin" on the tag; anggota = member; bukti transfer = proof of
 * transfer (short: proof); rekening kas = group account; denda = late fee;
 * undian = draw; jatuh tempo = due date; Lunas = Paid; Menunggu konfirmasi
 * = Awaiting confirmation; Belum bayar = Unpaid; Telat N hari = Late N
 * days; tabs Status / Turns / History; Ingatkan / Konfirmasi / Tolak =
 * Remind / Confirm / Reject; the "Anda" tag = You.
 */
(function (root, factory) {
  var messages = factory();
  if (typeof module === 'object' && module.exports) module.exports = messages;
  if (root) {
    root.TurnlyMessages = root.TurnlyMessages || {};
    root.TurnlyMessages.en = messages;
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  return {
    'app.name': 'Turnly',

    // Beranda
    'home.greeting.morning': 'Good morning, {name}',
    'home.greeting.afternoon': 'Good afternoon, {name}',
    'home.greeting.evening': 'Good evening, {name}',
    'home.greeting.night': 'Good evening, {name}',
    'home.dueTitle': 'Contribution due',
    'home.dueOn': 'Due {date}',
    'home.daysLeft': '{days, plural, one{In 1 day} other{In # days}}',
    'home.dueToday': 'Due today',
    'home.pastDue': '{days, plural, one{1 day} other{# days}} past due',
    'home.allPaid': 'All your contributions are paid',
    'home.turnCard.title': 'Your turn to receive',
    'home.turnCard.on': 'On {date}',
    'home.turnCard.thisRound': 'You receive it this round',
    'home.turnCard.today': 'Today',
    'home.newArisan': 'Create new arisan',
    'home.newArisanDemo': 'Creating an arisan arrives with accounts. This demo shows sample groups.',

    'groups.title': 'Your arisan groups',
    'groups.explainer': 'An arisan is a rotating savings group: members pay in each round and take turns receiving the pot.',
    'groups.paidCount': '{paid} of {total} paid',
    'groups.round': 'Round {round} of {rounds}',
    'groups.recipient': 'Recipient: {name}',
    'groups.yourTurn': 'Your turn: Round {round} ({when})',
    'groups.yourTurnNow': 'Your turn: this round, you receive the pot',
    'groups.yourTurnPassed': 'Your turn was Round {round}',

    // Read aloud (Bacakan) on the Home contribution block: whole sentences
    // the browser's voice speaks. The amount arrives as plain digits, so
    // the voice reads it as a number.
    'read.start': 'Read aloud',
    'read.stop': 'Stop reading',
    'read.dueIn': 'Your contribution for {name} is {amount} rupiah, due {date}, {days, plural, one{in 1 day} other{in # days}}.',
    'read.dueToday': 'Your contribution for {name} is {amount} rupiah, due today.',
    'read.late': 'Your contribution for {name} is {amount} rupiah. It was due {date} and is {days, plural, one{1 day} other{# days}} late.',
    'read.recipient': "This round's recipient is {name}.",
    'read.recipientYou': 'This round, you receive the payout.',

    // Detail arisan: the turn circle and its surroundings
    'detail.turnOf': 'Turn {round} of {rounds}',
    'detail.collected': 'Collected {collected} of {total}',
    'detail.paidProgress': '{total, plural, one{{paid} of 1 member paid} other{{paid} of # members paid}}',
    'detail.seeList': 'See list',
    'detail.viewAs': 'Viewing as (demo)',
    'role.member': 'Member',
    'role.admin': 'Admin',

    'tab.status': 'Status',
    'tab.turns': 'Turns',
    'tab.history': 'History',

    'turns.current': 'Receiving this round',

    'history.round': 'Round {round} · {date}',
    'history.recipient': 'Recipient: {name}',
    'history.paidOut': 'Payout handed over',
    'history.showPayments': 'Show payments',
    'history.hidePayments': 'Hide payments',
    'history.paymentsLabel': 'Payments for round {round}',
    'history.empty': 'No finished rounds yet. The first payout appears here.',

    'action.confirm': 'Confirm',
    'action.reject': 'Reject',
    'action.remindWhatsApp': 'Remind via WhatsApp',

    // The member list sheet opened from the paid count.
    'members.title': 'Who has paid this round',
    'members.close': 'Close',

    // WhatsApp reminders: the app only opens a prefilled chat. One version
    // for an upcoming due date, one for a date that has passed.
    'whatsapp.reminder': 'Hi {name}, a friendly reminder from {group}: your round {round} contribution of {amount} is due on {date}. Please send your proof of transfer in Turnly. Thank you.',
    'whatsapp.reminderLate': 'Hi {name}, a friendly reminder from {group}: your round {round} contribution of {amount} was due on {date}. Please send your proof of transfer in Turnly. Thank you.',

    'reject.title': 'Reject proof from {name}',
    'reject.reasonLabel': 'Reason (optional)',
    'reject.reasonPlaceholder': 'For example: the amount does not match',

    'bar.remindUnpaid': '{count, plural, one{Remind 1 member} other{Remind # members}}',

    'status.paid': 'Paid',
    'status.awaiting': 'Awaiting confirmation',
    'status.unpaid': 'Unpaid',
    'status.late': 'Late {days, plural, one{1 day} other{# days}}',
    'status.nextToPay': 'Next to pay',

    'legend.title': 'What the statuses mean',
    'legend.paid': "This round's contribution was received",
    'legend.awaiting': 'Proof sent. Waiting for the organizer to confirm.',
    'legend.unpaid': 'No proof of transfer yet',
    'legend.late': 'Past the due date',
    'legend.sampleName': 'Sample',

    'tag.you': 'You',
    'tag.admin': 'Admin',

    'a11y.memberStatus': '{name}, {status}',
    'a11y.back': 'Back',
    'a11y.remindWhatsApp': 'Remind {name} via WhatsApp',

    'pay.action': 'Pay contribution',
    'pay.title': 'Pay contribution for {group}',
    'pay.transferTo': 'Transfer to',
    'pay.copyAccount': 'Copy account number',
    'pay.proofTitle': 'Send proof of transfer',
    'pay.choosePhoto': 'Choose photo',
    'pay.changePhoto': 'Change photo',
    'pay.sendProof': 'Send proof',
    'pay.proofAlt': 'Chosen proof photo',
    'pay.cancel': 'Cancel',
    'pay.confirmTitle': 'Send proof for {group}?',
    'pay.confirmMessage': 'Your {amount} contribution will be marked as sent, then the organizer checks it.',

    'toast.accountCopied': 'Account number copied',
    'toast.confirmed': 'Confirmed {name} as paid',
    'toast.rejected': 'Proof rejected. {name} can send a new one.',
    'demo.note': 'This screen shows sample data for demo mode.',

    'language.title': 'Language',
    'language.short.en': 'EN',
    'language.short.id': 'ID',
    'language.english': 'English',
    'language.indonesian': 'Bahasa Indonesia',
    'language.system': 'Follow system',
    'language.firstLaunch.title': 'Choose your language',
    'language.firstLaunch.hint': 'You can change it any time with ID | EN at the top of Home.',

    // Quick revision workshop (revisi.html): the owner's tool for previewing
    // the app at real screen widths and queueing point-by-point revisions.
    'revisi.open': 'Revision tools',
    'revisi.title': 'Quick revision',
    'revisi.back': 'Back to the app',
    'revisi.checklist': 'Checklist',
    'revisi.pointPlaceholder': 'Add a revision point',
    'revisi.add': 'Add',
    'revisi.pointOpen': 'Open',
    'revisi.pointDone': 'Done',
    'revisi.delete': 'Delete',
    'revisi.copyOpen': 'Copy open points',
    'revisi.copyIntro': 'Please fix only these points. Change nothing else:',
    'revisi.copied': 'Open points copied. Paste them as your revision request.',
    'revisi.empty': 'No points yet. Add the small fixes you spot while previewing.',

    'preview.title': 'Preview',
    'preview.home': 'Home',
    'preview.group': 'Group detail',
    'preview.reload': 'Reload',
    'preview.size': '{width} px wide',
    'preview.notClipped': 'No clipped text',
    'preview.clipped': '{count, plural, one{1 clipped line} other{# clipped lines}}',
    'preview.scanError': 'The preview could not load. The checklist still works.',
    'preview.retry': 'Retry',

    'versions.title': 'Version history',
    'versions.undo': 'Undo',
    'versions.restore': 'Restore',
    'versions.empty': 'Changes you make appear here.',
    'versions.action.added': 'Point added',
    'versions.action.edited': 'Point edited',
    'versions.action.deleted': 'Point deleted',
    'versions.action.markedDone': 'Point marked done',
    'versions.action.reopened': 'Point reopened',
    'versions.action.restored': 'Restored an earlier version',
    'versions.entry': '{action} · {open, plural, one{1 point open} other{# points open}} · {time}',
  };
});
