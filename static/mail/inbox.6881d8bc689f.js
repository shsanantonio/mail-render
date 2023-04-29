document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function send_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  document.querySelector('#compose-form').onsubmit = () => { // saving data to database
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
          recipients: document.querySelector('#compose-recipients').value,
          subject: document.querySelector('#compose-subject').value,
          body: document.querySelector('#compose-body').value
      })
    })
    .then(response => response.status)
    .then(status => {
      if(status === 201) {
        console.log(status);
        load_mailbox('sent'); //wait till data is saved before loading sent mails
      }
    });
    return false;
  }
}

function compose_email() {

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  send_email(); // Send email function
}

function reply_email(mailbox) {
  
  const email_div = document.querySelector('#email');
  const children = email_div.childNodes;
  const sender = children[1].childNodes[1].nodeValue;
  const timestamp = children[3].childNodes[1].nodeValue;

  // Pre-fill recipients
  document.querySelector('#compose-recipients').value = children[0].childNodes[1].nodeValue;
  
  // Pre-fill text-line and subject
  children[2].childNodes[1].nodeValue = children[2].childNodes[1].nodeValue.replace('Re: ', '');
  email_div.getElementsByTagName('span')[2].innerHTML = 'Re: ';
  document.querySelector('#compose-subject').value = children[2].textContent;
  
  // Pre-fill text line and body
  email_div.getElementsByTagName('span')[4].innerHTML = `\n** On ${timestamp} ${sender} wrote: **\n`;
  if(mailbox === 'sent') document.querySelector('#compose-body').value = children[5].textContent;
  else document.querySelector('#compose-body').value = children[6].textContent;
  

  send_email();
}

function archive_email(email) {

  if (email.archived === true) email.archived = false; // When email was already archived
  else email.archived = true

  fetch( `/emails/${email.id}`, { // Saves boolean value of archived to database
    method: 'PUT',
    body: JSON.stringify({
        archived: email.archived
    })
  })
  .then(response => {
    if(response.status === 204){
      console.log(response.status)
      load_mailbox('inbox'); //wait till data is saved before loading sent mails
    }
  });
  
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  fetch(`/emails/${mailbox}`) // Get data of all user emails from database
  .then(response => response.json())
  .then(emails => {
    emails.forEach( email => {

      // Create element per email
      const emailview = document.createElement('div');
      emailview.id = "email-view";
      if(email.read === true) emailview.style.cssText = "font-weight:normal; background-color:#dcdee3";

        Object.keys(email).forEach(key => {

          // Create element for sender, recicpient, subject and timestamp
          if(key === 'subject' || key === 'timestamp' ||
            (key === 'sender' &&  (mailbox === 'inbox' || mailbox === 'archive')) || // Show sender for inbox and archive mailbox
            (key === 'recipients' && mailbox === 'sent' )){ // Show recipients instead of user(sender) for sent mailbox
            const element = document.createElement('div');
            element.className = `${key}`;
            element.innerHTML = `${email[key]}`;
            emailview.append(element);
          }
        });
      emailview.addEventListener('click', function() { // View email when email(row) was clicked
        view_email(email, mailbox);
      });
      document.querySelector('#emails-view').append(emailview);
    });
  });
}

function view_email(email, mailbox) {

  const email_div = document.querySelector('#email');
  email_div.style.display = 'block';
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  while (email_div.hasChildNodes()) { // Refresh Mailbox
    email_div.removeChild(email_div.lastChild);
  } 

  fetch(`/emails/${email.id}`) // Get email data from database
  .then(response => response.json())
  .then(email => {
    Object.keys(email).forEach(key => {

      // Creates span element for title of each datum
      if (key === 'subject' || key === 'sender' || key === 'recipients' || key === 'body' || key === 'timestamp') {
        const element = document.createElement('div');
        const span = document.createElement('span');
        if (key === 'sender') span.innerHTML = "From: ";
        if (key === 'recipients') span.innerHTML = "To: ";
        if (key === 'subject') span.innerHTML = "Subject: ";
        if (key === 'timestamp') span.innerHTML = "Timestamp: ";
        
        element.className = `${key}-div`
        element.append(span);
        element.innerHTML += `${email[key]}`;
        if(key === 'body'){ // Add style to Body text line
          element.innerHTML = element.innerHTML.replaceAll(/\*\* /g,'<div class="body-pretext">** ');
          element.innerHTML = element.innerHTML.replaceAll(/ \*\*/g,' **</div>');
        }
        if (key === 'timestamp') email_div.insertBefore(element, email_div.childNodes[3]); // Change location before body element
        else email_div.append(element);
      }
    });

    // Reply button
    const replybttn = document.createElement('button');
    replybttn.className = "btn btn-sm btn-outline-primary";
    replybttn.innerHTML = "Reply";
    email_div.insertBefore(replybttn, email_div.childNodes[4]);

    replybttn.addEventListener('click', function(event) {
      reply_email(mailbox); // Reply function
    });

    if(mailbox === 'inbox'){
      fetch( `/emails/${email.id}`, { // Mark email as read and save boolean value to database
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
      });

      // Archive Button
      const archivebttn = document.createElement('button');  
      archivebttn.className = "btn btn-sm btn-outline-primary archive-button";
      archivebttn.innerHTML = "Archive";
      email_div.insertBefore(archivebttn, email_div.childNodes[5]);

      archivebttn.addEventListener('click', function(event) {
        archive_email(email); // Archive function
      });
    }

    if(mailbox === 'archive'){ // Create unarchive button once email was archived
      const unarchivebttn = document.createElement('button');  
      unarchivebttn.className = "btn btn-sm btn-outline-primary";
      unarchivebttn.innerHTML = "Unarchive";
      email_div.insertBefore(unarchivebttn, email_div.childNodes[5]);

      unarchivebttn.addEventListener('click', function(event) {
        archive_email(email);
      });
    }

      
  });
}
