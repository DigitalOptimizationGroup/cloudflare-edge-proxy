### Subtle differences of a/b testing, canary releasing, and seo a/b testing

This proxy utilizes hashing to make deterministic (and random) assignments. This is done by hashing an assignment string to a given number of assignment choices. The difference in these three modes lies in this assignment strategy.

#### a/b testing

A/B/n testing creates a hashing string by combining a `salt` and the `userId`. This generates a unique hashing string for each user and provides consistent (and stateless) assignment for that given hashing string. It can be used to a/b/n test any number of backends.

#### canary releasing

The goal of canary releasing is to gradually shift traffic from the default backend to a new `canary` backend. The potential trouble here can be that when increasing the percent of traffic going to the new backend we must assure that users already shifted to the new backend remain there. To do this we again create a hash string from a `salt` and the `userId`. However, this time we use modulo 100 to hash each user to a consistent number between 0 and 99. To move traffic we pick the percent we want, for example 5%. So for all users assigned a number < 5 we show them the canary release. If we then increase to 30% we show all users < 30 the canary, obviously this logic continues to include all prior users shown the canary. In this way you can gradually shift users from the default to the canary backend without causing already shifted users to lose their assignment.

#### seo a/b testing

With SEO a/b testing we are testing the impact of changes to our site on traffic volume from the search engines. This method was discussed in a blog post by Pinterest that can be seen here. To accomplish this we use a `salt` and the `pathname` to hash a given url to a given backend. In this way we randomize amoung our urls as opposed to our users. Any given path will always be consistently hashed to the same backend for the duration of the testing period.
