angular.module("claimsApp", ['ngRoute'])
    .config(function($routeProvider) {
        $routeProvider
            .when("/", {
                templateUrl: "list.html",
                controller: "ListController",
                resolve: {
                    claims: function(Claims) {
                        return Claims.getClaims();
                    }
                }
            })
            .when("/new/claim", {
                controller: "NewClaimController",
                templateUrl: "claim-form.html"
            })
            .when("/claim/:claimId", {
                controller: "EditClaimController",
                templateUrl: "claim.html"
            })
            .otherwise({
                redirectTo: "/"
            })
    })
    .service("Claims", function($http) {
        this.getClaims = function() {
            return $http.get("/claims").
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error finding claims.");
                });
        }
        this.createClaim = function(claim) {
            return $http.post("/claims", claim).
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error creating claim.");
                });
        }
        this.getClaim = function(claimsId) {
            var url = "/claims/" + claimsId;
            return $http.get(url).
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error finding this claim.");
                });
        }
        this.editClaim = function(claim) {
            var url = "/claims/" + claim._id;
            console.log(claim._id);
            return $http.put(url, claim).
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error editing this claim.");
                    console.log(response);
                });
        }
        this.deleteClaim = function(claimId) {
            var url = "/claims/" + claimId;
            return $http.delete(url).
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error deleting this claim.");
                    console.log(response);
                });
        }
    })
    .controller("ListController", function(claims, $scope) {
        $scope.claims = claims.data;
    })
    .controller("NewClaimController", function($scope, $location, Claims) {
        $scope.back = function() {
            $location.path("#/");
        }

        $scope.saveClaim = function(claim) {
            Claims.createClaim(claim).then(function(doc) {
                var claimUrl = "/claim/" + doc.data._id;
                $location.path(claimUrl);
            }, function(response) {
                alert(response);
            });
        }
    })
    .controller("EditClaimController", function($scope, $routeParams, Claims) {
        Claims.getClaim($routeParams.claimId).then(function(doc) {
            $scope.claim = doc.data;
        }, function(response) {
            alert(response);
        });

        $scope.toggleEdit = function() {
            $scope.editMode = true;
            $scope.claimFormUrl = "claim-form.html";
        }

        $scope.back = function() {
            $scope.editMode = false;
            $scope.claimFormUrl = "";
        }

        $scope.saveClaim = function(claim) {
            Claims.editClaim(claim);
            $scope.editMode = false;
            $scope.claimFormUrl = "";
        }

        $scope.deleteClaim = function(claimId) {
            Claims.deleteClaim(claimId);
        }
    });