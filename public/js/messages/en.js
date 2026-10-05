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
    'foundation.subtitle': 'Preview of the design foundation and sample data',

    'home.dueTitle': 'Contribution due',
    'home.dueIn': 'Due {date}, {days, plural, one{in 1 day} other{in # days}}',
    'home.dueToday': 'Due today',
    'home.pastDue': '{days, plural, one{1 day} other{# days}} past due',
    'home.allPaid': 'All your contributions are paid',

    'groups.title': 'Your arisan groups',
    'groups.explainer': 'An arisan is a rotating savings group: members pay in each round and take turns receiving the pot.',
    'groups.summary': '{paid} of {total} paid · Round {round} of {rounds}',

    'board.title': 'Contribution status board',
    'board.round': 'Round {round} of {rounds}',
    'board.roundWithRecipient': 'Round {round} of {rounds} · Recipient: {name}',

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

    'pay.action': 'Pay contribution',
    'pay.title': 'Pay contribution for {group}',
    'pay.transferTo': 'Transfer to',
    'pay.copyAccount': 'Copy account number',
    'pay.cancel': 'Cancel',

    'toast.accountCopied': 'Account number copied',
    'demo.note': 'This screen shows sample data for demo mode.',

    'language.title': 'Language',
    'language.english': 'English',
    'language.indonesian': 'Bahasa Indonesia',
    'language.system': 'Follow system',
  };
});
