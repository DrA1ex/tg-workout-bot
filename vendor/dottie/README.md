# Vendored dottie compatibility module

This directory contains the MIT-licensed `dottie` 2.0.7 implementation used by Sequelize 6.
It is vendored because the upstream npm package is deprecated even though Sequelize 6 still depends on its API.
The implementation includes the upstream prototype-pollution fix from 2.0.7.

Remove this package when the project moves to a Sequelize version that no longer depends on `dottie`.
