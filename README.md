# Commentable

Commentable is a small service designed to handle comments for a topic.

## Terminology

- topic: unique identifier that comments are attached to
- commit: a record of data attached to a topic.

## REST API

Create Comment
POST /comment

- append a new event indicating a new comment has been added.

Update Comment
PUT /comment/:aggregateId

- append a new event indicating the contents of a specific comment has changed

Close Comment
POST /comment/:aggregateId/close

- append a new event indicating the topic should not have any more replys

Delete Comment
DELETE /comment/:aggregateId

- append a new event indicating te content of a specific comment has been deleted

Queries

Fetch comment
GET /comment/:aggregateId

- get all events for a specific, produce an aggregate with the history of the comment as a property
- when reading events, all events should always be read in order.
- A comment can have many events, with the possibility of ending with a deleted event.
- You should be able to see the state of the comment at any point in time by applying each event until
  the desired state is reached. However, if the final event is a deleted event, this should be applied
  even if it's beyond the range of the desired state.

Fetch all comments on topic
GET /comments/:aggregateId

- get all comments replying to a topic (inclusive, as well as nested children)

## Stream API

commentCreated

- append a new event indicating a new comment has been added.

commentAmmended

- append a new event indicating the contents of the comment have been changed

commentClosed

- append a new event indicating that this is the last comment and should not allow further comments

commentWithdrawn

- append an event indicating that the contents of this comment should not be revealed. Should still be read and applied if it falls outside of a range of events.

## Persistence

- each comment should be a top level entity
- a comment can reference another comment as a topic
- lookup for all comments on a topic is an infinite recursion until implemented as a reference tree
