

# Design patter used to define data structure.

To make it easier to find your way into the type definition let us describe
the way the type are organized in Semasim.  

- The type hierarchy is represented using union types and nested namespaces 
- Logic relative to type are defined in namespace overload of the types.

NOTE: You might bee aware of the fact that namespace overload are not supported
in React Native. In fact they cannot be defined in react native project but they
can be used if imported from external module so you wont run into any problems
as Semasim core is not be part of the RN project.

## Example

```typescript

export type Person = Person.Student | Person.Teacher; 

export namespace Person {

    export type Common_ = {
        name: string;
        age: number;
    };

    export type Student = Common_ & {
        type: "STUDENT";
        grades: {
            maths: number;
            compSci: number;
        };
    };

    export namespace Student {

        export const match = (person: Person): person is Student => 
            person.type === "STUDENT";

        export const getAverageScore = (student: Student) => 
            (student.grades.compSci + student.grades.maths) / 2;

    }

    export type Teacher = Common_ & {
        type: "TEACHER";
        subject: "MATH" | "COMP-SCI";
    };

    export namespace Teacher {

        export const match = (person: Person): person is Teacher => 
            person.type === "TEACHER";

    }

}

//Usage: 
{

    const logPerson = (person: Person) =>
        console.log(
            [
                person.name,
                Person.Student.match(person) ?
                    `is a student, averageScore is: ${Person.Student.getAverageScore(person)}` :
                    `is a ${person.subject} teacher`
            ].join(" ")
        );


    const teacher: Person.Teacher = {
        "type": "TEACHER",
        "age": 53,
        "name": "Bob",
        "subject": "MATH"
    };

    //Prints: "Bob is a MATH teacher"
    logPerson(teacher);

}
```

# Semasim's data structures

Here I will introduce you to the data structures you will need to understand
to work on semasim. 

Don't be surprise if you notice inconsistency between this document and the types
definitions.

## ``UserSim``

## Conversation history.

Everything describe here belong to what is refereed to as the ``webphoneData``   
namespace that you will see abbreviated ``wd``.  

The user's conversation are stored encrypted on the backend as a result every types
of the ``webphoneData`` namespace take a string argument that is either ``"PLAIN"``
or ``"ENCRYPTED"`` but as far as you are concern it's always ``"PLAIN"``.

### ``wd.Message<"PLAIN">``

Messages are divided in two subtypes: incoming and outgoing.

Each message exists in the context of: 
- A given SIM card from which the associated SMS have been received/sent.
- A remote party on the cellular network identified by a phone number.
It's to whom the SMS are sent/received from.  
- A given semasim user.

The properties that are common to both outgoing and incoming messages are:

```typescript
type Common_={
    /** Time when the message was sent/received,
     * expressed in millisecond since epoch
     */
    time: number;
    /** Content of the message */
    text: string; 
}
```



#### ``wd.Message.Outgoing<"PLAIN">``


In Semasim the concept of outgoing messages can be quite confusing.
A single user can be connected from multiple devices and SIMs can be shared  
by multiple users so you will encounter outgoing messages that where not sent by the user  
and receive outgoing messages.  

An outgoing message is defined as a message that have been  
sent under the form of an SMS via the SIM to a recipient on the cellular network.  
Note that the message can have been sent by an other user that is sharing the sim card.  
Note also that the message does not have to be send from the device the code is currently  
running on the message can have been sent by the user from Semasim web or an other mobile device.

The properties shared by every outgoing messages are: 

```typescript
type _={
    direction: "OUTGOING";
    sentBy: { 
        who: "USER"; 
    } | { 
        who: "OTHER"; 
        /** Email of the semasim user that sent the message */
        email: string; 
    };
}
```
* Outgoing message sent by by the user: 
```typescript
{
    ...
    "sentBy": { "who": "USER" }
    ...
}
```
* Outgoing message sent by by the user: 
```typescript
{
    ...
    "sentBy": { "who": "OTHER"; "email": "bob@gmail.com"  }
    ...
}
```

##### Message state

Outgoing message can be in one of tree state: "PENDING", "SENT REPORT RECEIVED" and "STATUS REPORT RECEIVED".

###### ``wd.Message.Outgoing.Pending<"PLAIN">`` (final)

An outgoing message in ``"PENDING"`` state is a message that have been transmitted via internet  
to the gateway that have access to the sim card but the message hasn't be sent as a SMS over the cellular network yet.

The only property that is common to every outgoing message is: 

```typescript
type _={
    status: "PENDING";
};
```

* Sample
```typescript
{
    "direction": "INCOMING",
    "status": "PENDING";
    "time": 1581970930255,
    "text": "Hello world I am bob",
    "sentBy": { "who": "USER" }
}
```

###### ``wd.Message.Outgoing.SendReportReceived<"PLAIN">`` (final)

An outgoing message in ``"SENT REPORT RECEIVED"`` state is a message that has been sent as a SMS over the cellular network but we don't have an acknowledgment of receipt for it yet.

The message is either reported as successfully sent or as failed to be sent.
Sending fails can happen with prepaid SIM card with insufficient fund for example.

The properties shared by every outgoing messages in ``"SENT REPORT RECEIVED"`` state are: 

```typescript
type _={
    status: "SEND REPORT RECEIVED";
    isSentSuccessfully: boolean;
}
```

* Sample
```typescript
{
    "direction": "INCOMING",
    "status": "SEND REPORT RECEIVED";
    "isSentSuccessfully": true,
    "time": 1581970930255,
    "text": "Hello world I am bob",
    "sentBy": { "who": "USER" }
}
```

###### ``wd.Message.Outgoing.StatusReportReceived<"PLAIN">`` (final)


An outgoing message in ``"STATUS REPORT RECEIVED"`` state is a message that has been sent as a SMS over the cellular network and we have an acknowledgment of receipt for it.

The message is reported as having be delivered successfully or not.  
In the case the SMS have been successfully received we have the exact time at which it was delivered.  
If the message could not be delivered it can mean for example that the message was send to  
a landline phone that does not support SMS.

The properties shared by every outgoing messages in ``"STATUS REPORT RECEIVED"`` state are: 

```typescript
type _={
    status: "STATUS REPORT RECEIVED";
    deliveredTime: number | null;
}
```

* Sample  

```typescript
{
    "direction": "INCOMING",
    "status": "STATUS REPORT RECEIVED",
    "deliveredTime": 1581970990255,
    "time": 1581970930255,
    "text": "Hello world I am bob",
    "sentBy": { "who": "USER" }
}
```

#### ``wd.Message.Incoming<"PLAIN">``

An incoming message is defined as a message that have been receive on the SIM from  
the cellular network OR as a message sent by the system to the user.

The only property that is common to every incoming message is: 

```typescript
type _={
    direction: "INCOMING";
};
```

##### ``wd.Message.Incoming.Notification<"PLAIN">`` (final)

The only property that is common to every incoming notification is: 

```typescript
type _={
    isNotification: false;
};
```
* Sample: 
```typescript
{
    "direction": "INCOMING",
    "time": 1581970930255,
    "text": "Call placed, duration 00:00:02"
}
```

[As displayed in the web app](https://my.pcloud.com/publink/show?code=XZDR4BkZpnoNOi3dkeB0qTFTXYvaQpErirGk)


##### ``wd.Message.Incoming.Text<"PLAIN">`` (final)

Represent a SMS that have be sent to the phone number associated with the SIM.

The only property that is common to every incoming notification is: 

```typescript
type _={
    isNotification: false;
};
```

* Sample: 
```typescript
{
    "direction": "INCOMING",
    "time": 1581970930255,
    "text": "foo bar"
}
```


### ``wd.Chat<"PLAIN">``

A chat represent a conversation history held with a given sim card with a given remote party on the 
cellular network (a given phon number).

```typescript
type Chat<"PLAIN"> = {

    /** 
     * Phone number of the remote party on the cellular network 
     * in E.164 ISO format * e.g.: "+33636786385" 
     */
    contactNumber: string;
    /**
     * The name associated with the phone number in the user's
     * phonebook. More details about the phonebook in the 'UserSim'
     * section of this document.
     * If the number is not in the user's phonebook it's an empty string.
     */
    contactName: string;
    /**
     * If the contact is stored in the SIM card internal phonebook
     * it will be a index indicating the memory slot on the sim the number
     * is stored at.
     * If the number is not present on the SIM it's null.
     */
    contactIndexInSim: number | null;

    /**
     * 
     * An array containing the message associated with the conversation.
     * 
     * The messages are at all time ordered from the older to the newest.
     * This is the order in which the message should appear in the conversation screen.
     * 
     * Not that this ordering is not static, a message A can be before B at a given
     * point in time and reordered later and put after B.
     * 
     * Explanation as to why:
     * There is a delay between the time a user send a message
     * and the time it is delivered to the recipient. 
     * If we figure out with the status report that an OUTGOING message was delivered after
     * an INCOMING message although having been sent before we will place the 
     * OUTGOING message after the INCOMING one so it does not look like when the user scrolls 
     * the conversation that the INCOMING message was a response to the OUTGOING message
     * when at the time the INCOMING message was sent by the remote party the OUTGOING message
     * had not been delivered yet.
     * 
     * If you don't get it it's no big deal just remember that the ordering is not 
     * static.
     * 
     */
    message: Message<E>[];


};
```

Use ``wd.Chat.getUnreadMessageCount(wdChat: wd.Chat<"PLAIN">): number`` to get the number of messages that the user has not checkout yet in a given conversation.


Use 

