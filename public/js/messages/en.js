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
    'home.dueIn': 'Due {date}, {days, plural, one{in 1 day} other{in # days}}',
    'home.dueToday': 'Due today',
    'home.pastDue': '{days, plural, one{1 day} other{# days}} past due',
    'home.allPaid': 'All your contributions are paid',
    'home.newArisan': 'Create new arisan',
    'home.newArisanDemo': 'Creating an arisan arrives with accounts. This demo shows sample groups.',

    'groups.title': 'Your arisan groups',
    'groups.explainer': 'An arisan is a rotating savings group: members pay in each round and take turns receiving the pot.',
    'groups.summary': '{paid} of {total} paid · Round {round} of {rounds}',

    // Detail arisan: the turn circle and its surroundings
    'detail.turnOf': 'Turn {round} of {rounds}',
    'detail.collected': 'Collected {collected} of {total}',
    'detail.paidProgress': '{paid, plural, one{1 member paid} other{# members paid}}',
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
    'history.empty': 'No finished rounds yet. The first payout appears here.',

    'action.confirm': 'Confirm',
    'action.reject': 'Reject',
    'action.remind': 'Remind',

    'reject.title': 'Reject proof from {name}',
    'reject.reasonLabel': 'Reason (optional)',
    'reject.reasonPlaceholder': 'For example: the amount does not match',

    'bar.remindUnpaid': '{count, plural, one{Remind 1 member} other{Remind # members}}',

    'status.paid': 'Paid',
    'status.awaiting': 'Awaiting confirmation',
    'status.unpaid': 'Unpaid',
    'status.late': 'Late {days, plural, one{1 day} other{# days}}',

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

    'toast.accountCopied': 'Account number copied',
    'toast.confirmed': 'Confirmed {name} as paid',
    'toast.rejected': 'Proof rejected. {name} can send a new one.',
    'toast.reminderSent': 'Reminder sent to {name}',
    'toast.remindersSent': '{count, plural, one{Reminder sent to 1 member} other{Reminder sent to # members}}',
    'demo.note': 'This screen shows sample data for demo mode.',

    'language.title': 'Language',
    'language.english': 'English',
    'language.indonesian': 'Bahasa Indonesia',
    'language.system': 'Follow system',

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
